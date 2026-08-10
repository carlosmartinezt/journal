import { db } from '../db/local/db'
import { queue } from '../db/local/queue'
import { meta } from '../db/local/meta'
import { getPlatform } from '../platform'
import { log } from '../lib/logger'
import type { RemoteGateway } from './gateway'
import type { Entry, Photo, RemoteEntry, RemotePhoto, SyncState } from '../types'

type StateListener = (state: SyncState) => void

/** Overlap window (ms) subtracted from the pull cursor to avoid missing rows
 *  written concurrently with a sync. Re-pulling is harmless (idempotent). */
const CURSOR_OVERLAP_MS = 2000

/** Periodic background sync while online + foregrounded. */
const PERIODIC_MS = 30_000

/** Debounce for mutation-triggered syncs so bursts of edits coalesce. */
const DEBOUNCE_MS = 1500

/**
 * The synchronization engine. It is deliberately free of React: the UI reads
 * IndexedDB (via liveQuery) and this engine reconciles IndexedDB with the
 * remote backend through a RemoteGateway. It is safe to call `sync()` many
 * times — pushes are idempotent (client-UUID primary keys + upserts).
 */
export class SyncEngine {
  private gateway: RemoteGateway | null = null
  private userId: string | null = null

  private state: SyncState = {
    phase: 'idle',
    pending: 0,
    lastSyncedAt: null,
    lastError: null,
  }
  private listeners = new Set<StateListener>()

  private running = false
  private rerunRequested = false
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private intervalTimer: ReturnType<typeof setInterval> | null = null
  private unbindOnline: (() => void) | null = null
  private unbindForeground: (() => void) | null = null
  private started = false

  private get net() {
    return getPlatform().connectivity
  }
  private get lifecycle() {
    return getPlatform().lifecycle
  }

  // ---- lifecycle ---------------------------------------------------------

  /** Attach a session. Call after auth (and on app start if already authed). */
  configure(gateway: RemoteGateway, userId: string) {
    this.gateway = gateway
    this.userId = userId
    void this.refreshPending()
  }

  /** Detach on logout — stop touching the network for the old user. */
  clearSession() {
    this.gateway = null
    this.userId = null
  }

  /** Wire up the automatic sync triggers (idempotent). */
  start() {
    if (this.started) return
    this.started = true

    // Trigger when connectivity returns.
    this.unbindOnline = this.net.subscribe((online) => {
      if (online) this.requestSync('online')
      else this.setState({ phase: 'offline' })
    })

    // Trigger when the app returns to the foreground.
    this.unbindForeground = this.lifecycle.onForeground(() => {
      if (this.net.isOnline()) this.requestSync('foreground')
    })

    // Periodic safety-net sync.
    this.intervalTimer = setInterval(() => {
      if (this.net.isOnline()) this.requestSync('interval')
    }, PERIODIC_MS)
  }

  stop() {
    this.started = false
    this.unbindOnline?.()
    this.unbindOnline = null
    this.unbindForeground?.()
    this.unbindForeground = null
    if (this.intervalTimer) clearInterval(this.intervalTimer)
    this.intervalTimer = null
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = null
  }

  // ---- state observation -------------------------------------------------

  subscribe(cb: StateListener): () => void {
    this.listeners.add(cb)
    cb(this.state)
    return () => this.listeners.delete(cb)
  }

  getState(): SyncState {
    return this.state
  }

  private setState(patch: Partial<SyncState>) {
    this.state = { ...this.state, ...patch }
    for (const l of this.listeners) l(this.state)
  }

  private async refreshPending() {
    const pending = await queue.count()
    this.setState({ pending })
  }

  // ---- triggering --------------------------------------------------------

  /** Debounced request to sync. Safe to call from anywhere, any time. */
  requestSync(reason = 'manual') {
    log.debug('requestSync', reason)
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = setTimeout(() => {
      void this.sync()
    }, DEBOUNCE_MS)
  }

  /** Immediate sync (still serialized). Used on startup / explicit actions. */
  async syncNow(): Promise<void> {
    if (this.debounceTimer) clearTimeout(this.debounceTimer)
    this.debounceTimer = null
    await this.sync()
  }

  // ---- the sync cycle ----------------------------------------------------

  async sync(): Promise<void> {
    if (!this.gateway || !this.userId) return
    if (!this.net.isOnline()) {
      this.setState({ phase: 'offline' })
      return
    }
    // Serialize: if a sync is already running, request one more pass after.
    if (this.running) {
      this.rerunRequested = true
      return
    }
    this.running = true
    this.setState({ phase: 'syncing', lastError: null })

    try {
      await this.push()
      await this.pull()
      await this.refreshPending()
      this.setState({
        phase: 'idle',
        lastSyncedAt: Date.now(),
        lastError: null,
      })
      await meta.setLastSyncedAt(Date.now())
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      log.warn('sync failed', message)
      this.setState({ phase: 'error', lastError: message })
    } finally {
      this.running = false
      if (this.rerunRequested) {
        this.rerunRequested = false
        // Give the event loop a tick, then run the follow-up pass.
        setTimeout(() => void this.sync(), 0)
      }
    }
  }

  // ---- push (local -> remote) -------------------------------------------

  private async push(): Promise<void> {
    const gateway = this.gateway!
    const items = await queue.all()

    for (const item of items) {
      if (!this.net.isOnline()) break
      try {
        switch (item.type) {
          case 'entry_upsert':
            await this.pushEntryUpsert(gateway, item.entityId, item.id!)
            break
          case 'entry_delete':
            await this.pushEntryDelete(gateway, item.entityId, item.id!)
            break
          case 'photo_upload':
            await this.pushPhotoUpload(gateway, item.entityId, item.id!)
            break
          case 'photo_delete':
            await this.pushPhotoDelete(gateway, item.entityId, item.id!)
            break
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        await queue.markFailure(item.id!, message)
        // Leave the item queued for a later retry; mark the entity's status.
        await this.markEntityError(item.type, item.entityId)
        log.warn('push item failed; will retry', item.type, message)
        // Continue with other items — one failure shouldn't block the rest.
      }
    }
  }

  private async pushEntryUpsert(gateway: RemoteGateway, entryId: string, queueId: number) {
    const entry = await db.entries.get(entryId)
    if (!entry) {
      await queue.remove(queueId)
      return
    }
    // Deletions are handled by entry_delete; if this got flipped, skip.
    if (entry.deletedAt) {
      await queue.remove(queueId)
      return
    }
    const before = entry.updatedAt
    const { updatedAt } = await gateway.upsertEntry(entry)

    // If the entry was edited during the network round-trip, keep it pending
    // (the queue item was reset by the edit) and don't mark synced.
    const after = await db.entries.get(entryId)
    if (after && after.updatedAt !== before) {
      await db.entries.update(entryId, { serverUpdatedAt: updatedAt })
      return
    }
    await db.entries.update(entryId, {
      serverUpdatedAt: updatedAt,
      syncStatus: 'synced',
    })
    await queue.remove(queueId)
  }

  private async pushEntryDelete(gateway: RemoteGateway, entryId: string, queueId: number) {
    const entry = await db.entries.get(entryId)
    if (!entry) {
      await queue.remove(queueId)
      return
    }
    const { updatedAt } = await gateway.deleteEntry(entry)
    // Keep a synced tombstone so a pull can't resurrect it.
    await db.entries.update(entryId, {
      serverUpdatedAt: updatedAt,
      syncStatus: 'synced',
    })
    await queue.remove(queueId)
  }

  private async pushPhotoUpload(gateway: RemoteGateway, photoId: string, queueId: number) {
    const photo = await db.photos.get(photoId)
    if (!photo) {
      await queue.remove(queueId)
      return
    }
    if (photo.deletedAt) {
      await queue.remove(queueId)
      return
    }
    // Already uploaded (path present) — just mark synced.
    if (photo.storagePath) {
      await db.photos.update(photoId, { syncStatus: 'synced' })
      await queue.remove(queueId)
      return
    }
    const { storagePath } = await gateway.uploadPhoto(photo)
    await db.photos.update(photoId, {
      storagePath,
      syncStatus: 'synced',
    })
    await queue.remove(queueId)
  }

  private async pushPhotoDelete(gateway: RemoteGateway, photoId: string, queueId: number) {
    const photo = await db.photos.get(photoId)
    if (!photo) {
      await queue.remove(queueId)
      return
    }
    await gateway.deletePhoto(photo)
    await db.photos.update(photoId, { syncStatus: 'synced' })
    await queue.remove(queueId)
  }

  private async markEntityError(type: string, entityId: string) {
    if (type.startsWith('entry')) {
      const e = await db.entries.get(entityId)
      if (e && e.syncStatus !== 'synced') {
        await db.entries.update(entityId, { syncStatus: 'sync_error' })
      }
    } else {
      const p = await db.photos.get(entityId)
      if (p && p.syncStatus !== 'synced') {
        await db.photos.update(entityId, { syncStatus: 'sync_error' })
      }
    }
  }

  // ---- pull (remote -> local) -------------------------------------------

  private async pull(): Promise<void> {
    const gateway = this.gateway!
    const userId = this.userId!
    const cursor = await meta.getPullCursor()

    const [remoteEntries, remotePhotos] = await Promise.all([
      gateway.pullEntries(userId, cursor),
      gateway.pullPhotos(userId, cursor),
    ])

    let maxSeen = cursor ? Date.parse(cursor) : 0

    for (const re of remoteEntries) {
      await this.mergeRemoteEntry(re)
      maxSeen = Math.max(maxSeen, Date.parse(re.updated_at))
    }
    for (const rp of remotePhotos) {
      await this.mergeRemotePhoto(rp)
      maxSeen = Math.max(maxSeen, Date.parse(rp.updated_at))
    }

    // Fetch bytes for any photos we know about but don't have locally.
    await this.ensurePhotoBlobs(gateway)

    if (maxSeen > 0) {
      const next = new Date(Math.max(0, maxSeen - CURSOR_OVERLAP_MS)).toISOString()
      await meta.setPullCursor(next)
    }
  }

  private async mergeRemoteEntry(remote: RemoteEntry): Promise<void> {
    const local = await db.entries.get(remote.id)
    const remoteUpdatedMs = Date.parse(remote.updated_at)

    const asLocal = (): Entry => ({
      id: remote.id,
      userId: remote.user_id,
      title: remote.title ?? '',
      content: remote.content,
      plainText: remote.plain_text ?? '',
      journalDate: remote.journal_date,
      createdAt: Date.parse(remote.created_at),
      updatedAt: remoteUpdatedMs,
      serverUpdatedAt: remote.updated_at,
      deletedAt: remote.deleted_at ? Date.parse(remote.deleted_at) : null,
      syncStatus: 'synced',
    })

    if (!local) {
      await db.entries.put(asLocal())
      return
    }

    // No local pending changes → the server copy is authoritative.
    if (local.syncStatus === 'synced') {
      await db.entries.put(asLocal())
      return
    }

    // Both sides changed → conflict. Last-write-wins, but never discard
    // silently: log the losing snapshot for debugging/recovery.
    if (remoteUpdatedMs > local.updatedAt) {
      await this.logConflict('remote', remote.id, local, remote)
      await db.entries.put(asLocal())
      // Drop any now-obsolete queued push for this entry.
      const q = await db.syncQueue
        .where('[type+entityId]')
        .equals(['entry_upsert', remote.id])
        .first()
      if (q?.id != null) await db.syncQueue.delete(q.id)
    } else {
      await this.logConflict('local', remote.id, local, remote)
      // Local wins: keep pending, but refresh our conflict base so the next
      // push is measured against the latest server version.
      await db.entries.update(remote.id, { serverUpdatedAt: remote.updated_at })
    }
  }

  private async mergeRemotePhoto(remote: RemotePhoto): Promise<void> {
    const local = await db.photos.get(remote.id)

    if (!local) {
      // Metadata only for now; bytes are fetched by ensurePhotoBlobs.
      const photo: Photo = {
        id: remote.id,
        entryId: remote.entry_id,
        userId: remote.user_id,
        blob: null,
        mimeType: remote.mime_type,
        width: remote.width,
        height: remote.height,
        storagePath: remote.storage_path,
        createdAt: Date.parse(remote.created_at),
        updatedAt: Date.parse(remote.updated_at),
        deletedAt: remote.deleted_at ? Date.parse(remote.deleted_at) : null,
        syncStatus: 'synced',
        order: remote.sort_order ?? 0,
      }
      await db.photos.put(photo)
      return
    }

    // Don't clobber a photo that still has un-pushed local state.
    if (local.syncStatus !== 'synced') return

    await db.photos.update(remote.id, {
      storagePath: remote.storage_path,
      mimeType: remote.mime_type,
      width: remote.width,
      height: remote.height,
      order: remote.sort_order ?? local.order,
      deletedAt: remote.deleted_at ? Date.parse(remote.deleted_at) : null,
      updatedAt: Date.parse(remote.updated_at),
    })
  }

  /** Download bytes for synced photos we don't yet have locally. */
  private async ensurePhotoBlobs(gateway: RemoteGateway): Promise<void> {
    const missing = await db.photos
      .filter((p) => !p.blob && !!p.storagePath && !p.deletedAt)
      .toArray()
    for (const p of missing) {
      if (!this.net.isOnline()) break
      try {
        const blob = await gateway.downloadPhoto(p.storagePath!)
        await db.photos.update(p.id, { blob })
      } catch (err) {
        log.warn('photo download failed; will retry', p.id, err)
      }
    }
  }

  private async logConflict(
    winner: 'local' | 'remote',
    entityId: string,
    local: unknown,
    remote: unknown,
  ) {
    await db.conflicts.add({
      entityType: 'entry',
      entityId,
      detectedAt: Date.now(),
      winner,
      localSnapshot: local,
      remoteSnapshot: remote,
    })
    log.warn('conflict resolved', { entityId, winner })
  }
}

/** App-wide singleton. Configured by the auth layer once a user is known. */
export const syncEngine = new SyncEngine()
