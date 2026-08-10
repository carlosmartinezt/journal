import { db } from './db'
import { queue } from './queue'
import { uuid } from '../../lib/id'
import { toJournalDate } from '../../lib/date'
import { emptyDoc, docToPlainText } from '../../lib/content'
import type { Entry, TipTapDoc } from '../../types'

/**
 * Local-first CRUD for journal entries. Every operation writes to IndexedDB
 * first and (for mutations) enqueues a sync op. The UI reacts to these writes
 * via Dexie liveQuery, so online and offline behaviour are identical. The
 * sync engine consumes the queue when connectivity allows.
 */

export interface CreateEntryInput {
  userId: string
  title?: string
  content?: TipTapDoc
  journalDate?: string
  createdAt?: number
}

export const entriesRepo = {
  /** Create a new entry entirely locally and queue it for push. */
  async create(input: CreateEntryInput): Promise<Entry> {
    const now = input.createdAt ?? Date.now()
    const content = input.content ?? emptyDoc()
    const entry: Entry = {
      id: uuid(),
      userId: input.userId,
      title: input.title?.trim() ?? '',
      content,
      plainText: docToPlainText(content),
      journalDate: input.journalDate ?? toJournalDate(now),
      createdAt: now,
      updatedAt: now,
      serverUpdatedAt: null,
      deletedAt: null,
      syncStatus: 'pending_create',
    }
    await db.entries.put(entry)
    await queue.enqueue('entry_upsert', entry.id, entry.userId)
    return entry
  },

  /**
   * Insert an entry from an external source (e.g. a Day One import) with a
   * caller-supplied id and timestamps, marked for sync. Idempotent on id
   * (upsert), so re-importing the same export won't create duplicates.
   */
  async importEntry(input: {
    id: string
    userId: string
    title: string
    content: TipTapDoc
    journalDate: string
    createdAt: number
    updatedAt: number
  }): Promise<Entry> {
    const entry: Entry = {
      id: input.id,
      userId: input.userId,
      title: input.title.trim(),
      content: input.content,
      plainText: docToPlainText(input.content),
      journalDate: input.journalDate,
      createdAt: input.createdAt,
      updatedAt: input.updatedAt,
      serverUpdatedAt: null,
      deletedAt: null,
      syncStatus: 'pending_create',
    }
    await db.entries.put(entry)
    await queue.enqueue('entry_upsert', entry.id, entry.userId)
    return entry
  },

  async get(id: string): Promise<Entry | undefined> {
    return db.entries.get(id)
  },

  /**
   * Apply a partial update. Bumps updatedAt (last-write-wins clock) and moves
   * the entry to a pending state unless it was a brand-new local create (which
   * stays pending_create so it's still a single INSERT on the server).
   */
  async update(
    id: string,
    patch: Partial<Pick<Entry, 'title' | 'content' | 'journalDate'>>,
  ): Promise<Entry | undefined> {
    const existing = await db.entries.get(id)
    if (!existing || existing.deletedAt) return existing

    const next: Entry = {
      ...existing,
      ...patch,
      updatedAt: Date.now(),
    }
    if (patch.content) next.plainText = docToPlainText(patch.content)
    if (patch.title !== undefined) next.title = patch.title

    // Preserve pending_create so we never split a create into insert+update.
    next.syncStatus = existing.syncStatus === 'pending_create' ? 'pending_create' : 'pending_update'

    await db.entries.put(next)
    await queue.enqueue('entry_upsert', next.id, next.userId)
    return next
  },

  /**
   * Soft-delete. If the entry was never pushed (pending_create) we can hard
   * remove it locally — the server never knew about it, so nothing to delete
   * remotely and no risk of resurrection on pull.
   */
  async softDelete(id: string): Promise<void> {
    const existing = await db.entries.get(id)
    if (!existing) return

    if (existing.syncStatus === 'pending_create') {
      await db.entries.delete(id)
      // Drop any queued upsert for this never-synced entry.
      const q = await db.syncQueue.where('[type+entityId]').equals(['entry_upsert', id]).first()
      if (q?.id != null) await db.syncQueue.delete(q.id)
      // Cascade: remove its local-only photos too.
      await db.photos.where('entryId').equals(id).delete()
      return
    }

    const now = Date.now()
    await db.entries.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending_delete',
    })
    await queue.enqueue('entry_delete', id, existing.userId)
  },

  /** Live list of a user's non-deleted entries, newest first. */
  liveList(userId: string) {
    return db.entries
      .where('[userId+deletedAt]')
      .equals([userId, 0 as unknown as number]) // placeholder; see note below
  },
}

/*
 * NOTE on the deletedAt index: Dexie can't index `null`, so for querying
 * "not deleted" we filter in the hook rather than via a compound key on null.
 * `liveList` above is intentionally unused by the UI; hooks/useEntries.ts does
 * the correct filtered query. Kept here only to document the tradeoff.
 */
