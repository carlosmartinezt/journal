import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/local/db'

/** A small object-URL for an entry's first photo, for timeline thumbnails. */
export function useFirstPhoto(entryId: string): { url: string | null; count: number } {
  const photos = useLiveQuery(
    async () => {
      const all = await db.photos.where('entryId').equals(entryId).toArray()
      return all.filter((p) => !p.deletedAt).sort((a, b) => a.order - b.order)
    },
    [entryId],
    [],
  )

  const first = photos[0]
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!first?.blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(first.blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [first?.blob])

  return { url, count: photos.length }
}
