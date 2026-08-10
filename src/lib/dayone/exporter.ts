import JSZip from 'jszip'
import SparkMD5 from 'spark-md5'
import { db } from '../../db/local/db'
import { tipTapToMarkdown } from './markdown'
import { typeForMime, uuidToDayOneId } from './common'
import type { DayOneEntry, DayOneJournal, DayOnePhoto } from './types'

export interface ExportResult {
  blob: Blob
  entries: number
  photos: number
  warnings: string[]
}

/**
 * Export the user's journal into a Day One-compatible .zip: a `Journal.json`
 * in Day One's schema plus a `photos/` folder of `<md5>.<ext>` files, with
 * inline `dayone-moment://` references so photos re-import in the right place.
 */
export async function exportDayOne(userId: string): Promise<ExportResult> {
  const warnings: string[] = []
  const zip = new JSZip()
  const photosDir = zip.folder('photos')!

  const entries = (await db.entries.where('userId').equals(userId).toArray())
    .filter((e) => !e.deletedAt)
    .sort((a, b) => a.createdAt - b.createdAt)

  const outEntries: DayOneEntry[] = []
  let photoCount = 0
  const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

  for (const entry of entries) {
    const photos = (await db.photos.where('entryId').equals(entry.id).toArray())
      .filter((p) => !p.deletedAt)
      .sort((a, b) => a.order - b.order)

    const dayOnePhotos: DayOnePhoto[] = []
    const momentRefs: string[] = []

    for (const photo of photos) {
      if (!photo.blob) {
        warnings.push(`Photo ${photo.id} has no local copy yet — skipped (open it online to cache it first).`)
        continue
      }
      const bytes = new Uint8Array(await photo.blob.arrayBuffer())
      const md5 = SparkMD5.ArrayBuffer.hash(bytes.buffer)
      const ext = typeForMime(photo.mimeType)
      photosDir.file(`${md5}.${ext}`, bytes)

      const identifier = uuidToDayOneId(photo.id)
      dayOnePhotos.push({
        identifier,
        md5,
        type: ext,
        orderInEntry: photo.order,
        width: photo.width,
        height: photo.height,
      })
      momentRefs.push(`![](dayone-moment://${identifier})`)
      photoCount++
    }

    // Body markdown, with the title as a leading H1 and photos appended.
    const body = tipTapToMarkdown(entry.content)
    const pieces: string[] = []
    if (entry.title.trim()) pieces.push(`# ${entry.title.trim()}`)
    if (body) pieces.push(body)
    if (momentRefs.length) pieces.push(momentRefs.join('\n'))
    const text = pieces.join('\n\n')

    outEntries.push({
      uuid: uuidToDayOneId(entry.id),
      creationDate: new Date(entry.createdAt).toISOString(),
      modifiedDate: new Date(entry.updatedAt).toISOString(),
      text,
      timeZone: localTz,
      starred: false,
      photos: dayOnePhotos.length ? dayOnePhotos : undefined,
    })
  }

  const journal: DayOneJournal = {
    metadata: { version: '1.0' },
    entries: outEntries,
  }
  zip.file('Journal.json', JSON.stringify(journal, null, 2))

  const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  return { blob, entries: outEntries.length, photos: photoCount, warnings }
}
