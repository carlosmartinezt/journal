import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/local/db'
import type { Photo } from '../types'

export interface PhotoView {
  photo: Photo
  /** Object URL for the local blob, or null if bytes aren't downloaded yet. */
  url: string | null
  /** True while the photo exists remotely but hasn't been fetched locally. */
  loadingBytes: boolean
}

/**
 * Reactive photos for an entry, each with a managed object URL for its local
 * blob. Object URLs are created/revoked as blobs change so we never leak them.
 */
export function usePhotos(entryId: string | undefined): PhotoView[] {
  const photos = useLiveQuery(
    async () => {
      if (!entryId) return [] as Photo[]
      const all = await db.photos.where('entryId').equals(entryId).toArray()
      return all.filter((p) => !p.deletedAt).sort((a, b) => a.order - b.order)
    },
    [entryId],
    [] as Photo[],
  )

  // Track live object URLs keyed by photo id so we can revoke stale ones.
  const urlsRef = useRef<Map<string, { blob: Blob; url: string }>>(new Map())
  const [, forceRender] = useState(0)

  useEffect(() => {
    const map = urlsRef.current
    const seen = new Set<string>()
    let changed = false

    for (const p of photos) {
      seen.add(p.id)
      const existing = map.get(p.id)
      if (p.blob && (!existing || existing.blob !== p.blob)) {
        if (existing) URL.revokeObjectURL(existing.url)
        map.set(p.id, { blob: p.blob, url: URL.createObjectURL(p.blob) })
        changed = true
      }
    }
    // Revoke URLs for photos that vanished.
    for (const [id, entry] of map) {
      if (!seen.has(id)) {
        URL.revokeObjectURL(entry.url)
        map.delete(id)
        changed = true
      }
    }
    if (changed) forceRender((n) => n + 1)
  }, [photos])

  // Revoke everything on unmount.
  useEffect(() => {
    const map = urlsRef.current
    return () => {
      for (const entry of map.values()) URL.revokeObjectURL(entry.url)
      map.clear()
    }
  }, [])

  return useMemo(
    () =>
      photos.map((photo) => ({
        photo,
        url: urlsRef.current.get(photo.id)?.url ?? null,
        loadingBytes: !photo.blob && !!photo.storagePath,
      })),
    [photos],
  )
}
