import type { SupabaseClient } from '@supabase/supabase-js'
import type { RemoteGateway } from '../../sync/gateway'
import { STORAGE_BUCKET } from '../../lib/supabase'
import type { Entry, Photo, RemoteEntry, RemotePhoto } from '../../types'

/**
 * Supabase-backed implementation of RemoteGateway. All row access is
 * implicitly scoped to the authenticated user by Row Level Security — this
 * code never filters by user_id for security, only for efficiency.
 */
export class SupabaseGateway implements RemoteGateway {
  private client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async upsertEntry(entry: Entry): Promise<{ updatedAt: string }> {
    // Client owns id/created_at/updated_at so writes are idempotent and
    // last-write-wins is decided by our clock. onConflict on the PK makes a
    // repeated push a no-op update rather than a duplicate row.
    const row = {
      id: entry.id,
      user_id: entry.userId,
      title: entry.title,
      content: entry.content,
      plain_text: entry.plainText,
      journal_date: entry.journalDate,
      created_at: new Date(entry.createdAt).toISOString(),
      updated_at: new Date(entry.updatedAt).toISOString(),
      deleted_at: entry.deletedAt ? new Date(entry.deletedAt).toISOString() : null,
    }
    const { data, error } = await this.client
      .from('journal_entries')
      .upsert(row, { onConflict: 'id' })
      .select('updated_at')
      .single()
    if (error) throw new Error(`upsertEntry: ${error.message}`)
    return { updatedAt: (data as { updated_at: string }).updated_at }
  }

  async deleteEntry(entry: Entry): Promise<{ updatedAt: string }> {
    const updatedIso = new Date(entry.updatedAt).toISOString()
    const { data, error } = await this.client
      .from('journal_entries')
      .update({
        deleted_at: new Date(entry.deletedAt ?? Date.now()).toISOString(),
        updated_at: updatedIso,
      })
      .eq('id', entry.id)
      .select('updated_at')
      .single()
    if (error) throw new Error(`deleteEntry: ${error.message}`)
    return { updatedAt: (data as { updated_at: string }).updated_at }
  }

  async pullEntries(userId: string, since: string | null): Promise<RemoteEntry[]> {
    let q = this.client
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })
      .limit(1000)
    if (since) q = q.gt('updated_at', since)
    const { data, error } = await q
    if (error) throw new Error(`pullEntries: ${error.message}`)
    return (data ?? []) as RemoteEntry[]
  }

  async uploadPhoto(photo: Photo): Promise<{ storagePath: string; updatedAt: string }> {
    if (!photo.blob) throw new Error('uploadPhoto: no local blob')
    const ext = extFor(photo.mimeType)
    // Per-user path prefix — RLS on storage keys off the first folder segment.
    const path = `${photo.userId}/${photo.entryId}/${photo.id}.${ext}`

    const { error: upErr } = await this.client.storage
      .from(STORAGE_BUCKET)
      .upload(path, photo.blob, {
        contentType: photo.mimeType,
        upsert: true, // idempotent re-upload
      })
    if (upErr) throw new Error(`uploadPhoto/storage: ${upErr.message}`)

    const updatedIso = new Date(photo.updatedAt).toISOString()
    const row = {
      id: photo.id,
      entry_id: photo.entryId,
      user_id: photo.userId,
      storage_path: path,
      mime_type: photo.mimeType,
      width: photo.width,
      height: photo.height,
      sort_order: photo.order,
      created_at: new Date(photo.createdAt).toISOString(),
      updated_at: updatedIso,
      deleted_at: null,
    }
    const { data, error } = await this.client
      .from('journal_photos')
      .upsert(row, { onConflict: 'id' })
      .select('updated_at')
      .single()
    if (error) throw new Error(`uploadPhoto/row: ${error.message}`)
    return { storagePath: path, updatedAt: (data as { updated_at: string }).updated_at }
  }

  async deletePhoto(photo: Photo): Promise<{ updatedAt: string }> {
    // Best-effort object removal; the row soft-delete is the source of truth.
    if (photo.storagePath) {
      await this.client.storage.from(STORAGE_BUCKET).remove([photo.storagePath])
    }
    const updatedIso = new Date(photo.updatedAt).toISOString()
    const { data, error } = await this.client
      .from('journal_photos')
      .update({
        deleted_at: new Date(photo.deletedAt ?? Date.now()).toISOString(),
        updated_at: updatedIso,
      })
      .eq('id', photo.id)
      .select('updated_at')
      .single()
    if (error) throw new Error(`deletePhoto: ${error.message}`)
    return { updatedAt: (data as { updated_at: string }).updated_at }
  }

  async pullPhotos(userId: string, since: string | null): Promise<RemotePhoto[]> {
    let q = this.client
      .from('journal_photos')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: true })
      .limit(2000)
    if (since) q = q.gt('updated_at', since)
    const { data, error } = await q
    if (error) throw new Error(`pullPhotos: ${error.message}`)
    return (data ?? []) as RemotePhoto[]
  }

  async downloadPhoto(storagePath: string): Promise<Blob> {
    const { data, error } = await this.client.storage.from(STORAGE_BUCKET).download(storagePath)
    if (error || !data) throw new Error(`downloadPhoto: ${error?.message ?? 'no data'}`)
    return data
  }
}

function extFor(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    default:
      return 'jpg'
  }
}
