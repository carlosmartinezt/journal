import type { Entry, Photo, RemoteEntry, RemotePhoto } from '../types'

/**
 * The boundary between the sync engine and the remote backend. The engine
 * depends only on this interface, so it can be driven by the real Supabase
 * gateway in production and by an in-memory fake in tests. This is the key
 * decoupling that keeps sync logic independently testable.
 */
export interface RemoteGateway {
  /** Idempotent upsert keyed by the client-generated entry id. Returns the
   *  server's authoritative updated_at (ISO string). */
  upsertEntry(entry: Entry): Promise<{ updatedAt: string }>

  /** Soft-delete on the server. Returns new server updated_at. */
  deleteEntry(entry: Entry): Promise<{ updatedAt: string }>

  /** Entries whose updated_at is strictly greater than `since` (or all if null). */
  pullEntries(userId: string, since: string | null): Promise<RemoteEntry[]>

  /** Upload the photo's blob to storage; returns its storage path + updated_at. */
  uploadPhoto(photo: Photo): Promise<{ storagePath: string; updatedAt: string }>

  /** Soft-delete a photo (row + best-effort object removal). */
  deletePhoto(photo: Photo): Promise<{ updatedAt: string }>

  /** Photo rows changed since `since`. */
  pullPhotos(userId: string, since: string | null): Promise<RemotePhoto[]>

  /** Download the bytes for a stored photo (to cache locally for offline). */
  downloadPhoto(storagePath: string): Promise<Blob>
}
