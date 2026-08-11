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
  // Bumped whenever the URL map changes. The view below must depend on this:
  // the map is a ref, so without it the memo would keep serving the URLs it
  // computed before the effect ran — i.e. null — and photos would never appear.
  const [urlVersion, forceRender] = useState(0)

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
    // `urlVersion` looks unnecessary to the linter — it isn't. The URLs live in
    // a ref, so this counter is the only thing that tells the memo they changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [photos, urlVersion],
  )
}
