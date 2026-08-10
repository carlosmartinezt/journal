/**
 * Core domain types shared across the UI, local persistence (Dexie),
 * the sync engine, and the remote API (Supabase). Keeping these in one
 * place makes the client the source of truth for the data model.
 */

/** TipTap stores its document as a structured JSON node tree. */
export type TipTapDoc = {
  type: 'doc'
  content?: unknown[]
}

/**
 * Local sync lifecycle for any syncable entity.
 * - synced:          matches the server as of the last successful sync
 * - pending_create:  created locally, never pushed
 * - pending_update:  exists on server, has un-pushed local edits
 * - pending_delete:  soft-deleted locally, deletion not yet pushed
 * - sync_error:      last push/pull attempt failed; will be retried
 */
export type SyncStatus =
  | 'synced'
  | 'pending_create'
  | 'pending_update'
  | 'pending_delete'
  | 'sync_error'

/** A journal entry as stored locally in IndexedDB. */
export interface Entry {
  /** UUID generated on the client so entries can be created fully offline. */
  id: string
  userId: string
  title: string
  /** Structured TipTap document (NOT rendered HTML). */
  content: TipTapDoc
  /** Plain-text projection kept in sync for previews + future search. */
  plainText: string
  /** The date the entry belongs to (YYYY-MM-DD, local time). */
  journalDate: string
  /** ms epoch. */
  createdAt: number
  /** ms epoch — bumped on every local mutation; drives last-write-wins. */
  updatedAt: number
  /** Server's updated_at (ISO string) as of last sync; used as pull cursor + conflict base. */
  serverUpdatedAt: string | null
  /** ms epoch when soft-deleted, else null. */
  deletedAt: number | null
  syncStatus: SyncStatus
}

/** A photo attached to an entry, stored locally with its original Blob. */
export interface Photo {
  id: string
  entryId: string
  userId: string
  /** The (compressed) image bytes, held locally so it renders offline. */
  blob: Blob | null
  mimeType: string
  width: number
  height: number
  /** Remote object path once uploaded, else null. */
  storagePath: string | null
  createdAt: number
  updatedAt: number
  deletedAt: number | null
  syncStatus: SyncStatus
  /** Ordering within an entry. */
  order: number
}

/** Kinds of operations the sync engine knows how to push. */
export type SyncOpType =
  | 'entry_upsert'
  | 'entry_delete'
  | 'photo_upload'
  | 'photo_delete'

/**
 * A durable, ordered record of work to push to the server. The queue is
 * an optimisation/observability aid — the source of truth for *what* needs
 * pushing is always each row's syncStatus, so a rebuilt queue stays correct.
 */
export interface SyncQueueItem {
  /** Auto-increment key. */
  id?: number
  type: SyncOpType
  /** Entry id or photo id depending on type. */
  entityId: string
  userId: string
  createdAt: number
  attempts: number
  lastAttemptAt: number | null
  lastError: string | null
}

/** Preserved record of a sync conflict (never silently discard data). */
export interface ConflictRecord {
  id?: number
  entityType: 'entry'
  entityId: string
  detectedAt: number
  /** The version we kept. */
  winner: 'local' | 'remote'
  localSnapshot: unknown
  remoteSnapshot: unknown
}

/** Small key/value store for app-level metadata + cached session. */
export interface AppMetaRecord {
  key: string
  value: unknown
}

/** Minimal user identity cached for offline use. */
export interface CachedUser {
  id: string
  email: string | null
}

/** Overall engine state surfaced to the UI. */
export type SyncPhase = 'idle' | 'syncing' | 'offline' | 'error'

export interface SyncState {
  phase: SyncPhase
  pending: number
  lastSyncedAt: number | null
  lastError: string | null
}

/** Shape of a row in the Supabase `journal_entries` table. */
export interface RemoteEntry {
  id: string
  user_id: string
  title: string
  content: TipTapDoc
  plain_text: string
  journal_date: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

/** Shape of a row in the Supabase `journal_photos` table. */
export interface RemotePhoto {
  id: string
  entry_id: string
  user_id: string
  storage_path: string
  mime_type: string
  width: number
  height: number
  sort_order: number
  created_at: string
  updated_at: string
  deleted_at: string | null
}
