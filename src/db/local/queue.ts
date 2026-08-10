import { db } from './db'
import type { SyncOpType, SyncQueueItem } from '../../types'

/**
 * The sync queue records pending pushes. It is deduplicated on
 * (type, entityId): enqueuing the same op again just refreshes the existing
 * row rather than creating a duplicate, which keeps pushing idempotent even if
 * a user edits the same entry many times offline.
 */
export const queue = {
  async enqueue(type: SyncOpType, entityId: string, userId: string): Promise<void> {
    const existing = await db.syncQueue.where('[type+entityId]').equals([type, entityId]).first()
    if (existing) {
      // Reset error/attempt state so it gets retried promptly.
      await db.syncQueue.update(existing.id!, {
        attempts: 0,
        lastError: null,
      })
      return
    }
    const item: SyncQueueItem = {
      type,
      entityId,
      userId,
      createdAt: Date.now(),
      attempts: 0,
      lastAttemptAt: null,
      lastError: null,
    }
    await db.syncQueue.add(item)
  },

  async all(): Promise<SyncQueueItem[]> {
    return db.syncQueue.orderBy('id').toArray()
  },

  async count(): Promise<number> {
    return db.syncQueue.count()
  },

  async remove(id: number): Promise<void> {
    await db.syncQueue.delete(id)
  },

  async markFailure(id: number, error: string): Promise<void> {
    const item = await db.syncQueue.get(id)
    if (!item) return
    await db.syncQueue.update(id, {
      attempts: item.attempts + 1,
      lastAttemptAt: Date.now(),
      lastError: error,
    })
  },

  async clear(): Promise<void> {
    await db.syncQueue.clear()
  },
}
