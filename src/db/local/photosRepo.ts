import { db } from './db'
import { queue } from './queue'
import { uuid } from '../../lib/id'
import { getPlatform } from '../../platform'
import type { Photo } from '../../types'

/**
 * Local-first photo storage. A picked/captured file is compressed and stored
 * as a Blob in IndexedDB immediately (so it renders offline), associated with
 * its entry, and marked pending upload. The sync engine uploads it to Supabase
 * Storage when connectivity returns and records the resulting storage path.
 */
export const photosRepo = {
  /** Process + persist a photo locally and queue its upload. */
  async addFromFile(entryId: string, userId: string, file: File): Promise<Photo> {
    const processed = await getPlatform().imageProcessor.process(file)
    const maxOrder = await this.maxOrder(entryId)
    const photo: Photo = {
      id: uuid(),
      entryId,
      userId,
      blob: processed.blob,
      mimeType: processed.mimeType,
      width: processed.width,
      height: processed.height,
      storagePath: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deletedAt: null,
      syncStatus: 'pending_create',
      order: maxOrder + 1,
    }
    await db.photos.put(photo)
    await queue.enqueue('photo_upload', photo.id, userId)
    return photo
  },

  /**
   * Add a photo from an existing Blob (e.g. a Day One import) using a caller-
   * supplied id and metadata. Bytes are stored as-is (no recompression) and the
   * upload is queued. Idempotent on id, so re-importing won't duplicate.
   */
  async addImported(input: {
    id: string
    entryId: string
    userId: string
    blob: Blob
    mimeType: string
    width: number
    height: number
    order: number
    createdAt: number
  }): Promise<Photo> {
    const photo: Photo = {
      id: input.id,
      entryId: input.entryId,
      userId: input.userId,
      blob: input.blob,
      mimeType: input.mimeType,
      width: input.width,
      height: input.height,
      storagePath: null,
      createdAt: input.createdAt,
      updatedAt: Date.now(),
      deletedAt: null,
      syncStatus: 'pending_create',
      order: input.order,
    }
    await db.photos.put(photo)
    await queue.enqueue('photo_upload', photo.id, input.userId)
    return photo
  },

  async get(id: string): Promise<Photo | undefined> {
    return db.photos.get(id)
  },

  async listForEntry(entryId: string): Promise<Photo[]> {
    const all = await db.photos.where('entryId').equals(entryId).toArray()
    return all.filter((p) => !p.deletedAt).sort((a, b) => a.order - b.order)
  },

  async maxOrder(entryId: string): Promise<number> {
    const all = await db.photos.where('entryId').equals(entryId).toArray()
    return all.reduce((m, p) => Math.max(m, p.order), 0)
  },

  /** Soft-delete a photo; hard-remove if it never reached the server. */
  async softDelete(id: string): Promise<void> {
    const photo = await db.photos.get(id)
    if (!photo) return

    if (photo.syncStatus === 'pending_create' && !photo.storagePath) {
      await db.photos.delete(id)
      const q = await db.syncQueue.where('[type+entityId]').equals(['photo_upload', id]).first()
      if (q?.id != null) await db.syncQueue.delete(q.id)
      return
    }
    const now = Date.now()
    await db.photos.update(id, {
      deletedAt: now,
      updatedAt: now,
      syncStatus: 'pending_delete',
    })
    await queue.enqueue('photo_delete', id, photo.userId)
  },
}
