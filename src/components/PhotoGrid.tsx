import { usePhotos } from '../hooks/usePhotos'
import { photosRepo } from '../db/local/photosRepo'
import { syncEngine } from '../sync/SyncEngine'

/**
 * Photo grid for the editor. Renders local blobs immediately (offline), shows
 * a subtle "pending upload" hint, and allows removal. Never asks the user to
 * manually retry an upload.
 */
export function PhotoGrid({ entryId }: { entryId: string }) {
  const photos = usePhotos(entryId)
  if (photos.length === 0) return null

  const remove = async (id: string) => {
    await photosRepo.softDelete(id)
    syncEngine.requestSync('photo-delete')
  }

  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {photos.map(({ photo, url, loadingBytes }) => (
        <div key={photo.id} className="group relative aspect-square overflow-hidden rounded-xl bg-line">
          {url ? (
            <img src={url} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-ink-faint">
              {loadingBytes ? 'Loading…' : ''}
            </div>
          )}

          {/* Pending-upload dot (non-alarming). */}
          {photo.syncStatus !== 'synced' && !photo.deletedAt && (
            <span
              className="absolute left-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-black/10"
              title="Will upload when online"
            />
          )}

          <button
            type="button"
            onClick={() => void remove(photo.id)}
            aria-label="Remove photo"
            className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink/70 text-paper opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  )
}
