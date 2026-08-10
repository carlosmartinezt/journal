import Dexie, { type Table } from 'dexie'
import type {
  Entry,
  Photo,
  SyncQueueItem,
  ConflictRecord,
  AppMetaRecord,
} from '../../types'

/**
 * The local IndexedDB database — the app's primary working store.
 *
 * Versioning note: bump `version(n)` and add a new `.stores()`/`.upgrade()`
 * block for schema changes. We NEVER delete this database on app update, so
 * journal data survives deploys. Only additive/upgrade migrations here.
 */
export class JournalDB extends Dexie {
  entries!: Table<Entry, string>
  photos!: Table<Photo, string>
  syncQueue!: Table<SyncQueueItem, number>
  conflicts!: Table<ConflictRecord, number>
  appMeta!: Table<AppMetaRecord, string>

  constructor() {
    super('journal')

    // v1 — initial schema.
    // Compound indexes power the timeline (by user+date) and the sync engine
    // (by syncStatus). Only indexed fields are listed; Blobs live off-index.
    this.version(1).stores({
      entries:
        'id, userId, syncStatus, journalDate, updatedAt, [userId+deletedAt], [userId+journalDate]',
      photos: 'id, entryId, userId, syncStatus, [entryId+deletedAt]',
      syncQueue: '++id, entityId, type, [type+entityId]',
      conflicts: '++id, entityId, detectedAt',
      appMeta: 'key',
    })
  }
}

export const db = new JournalDB()
