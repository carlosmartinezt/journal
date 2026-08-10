import JSZip from 'jszip'
import { entriesRepo } from '../../db/local/entriesRepo'
import { photosRepo } from '../../db/local/photosRepo'
import { syncEngine } from '../../sync/SyncEngine'
import { markdownToTipTap } from './markdown'
import {
  dayOneIdToUuid,
  journalDateFromIso,
  mimeForType,
  splitTitle,
  stripMomentRefs,
} from './common'
import type { DayOneEntry, DayOneJournal } from './types'

export interface ImportResult {
  entries: number
  photos: number
  warnings: string[]
}

export interface ImportProgress {
  phase: 'reading' | 'importing'
  current: number
  total: number
}

/**
 * Import a Day One .zip export (entries + photos) into the local store. Records
 * are created locally first (offline-first) and queued for sync; photos are
 * stored as blobs and uploaded to Storage in the background. Idempotent:
 * re-importing the same export upserts by id rather than duplicating.
 */
export async function importDayOne(
  file: File | Blob,
  userId: string,
  onProgress?: (p: ImportProgress) => void,
): Promise<ImportResult> {
  const warnings: string[] = []
  const allEntries: DayOneEntry[] = []
  const photoByMd5 = new Map<string, JSZip.JSZipObject>()

  if (await looksLikeZip(file)) {
    const zip = await JSZip.loadAsync(file)

    // Collect journal JSON files (Day One places them at the archive root).
    const jsonFiles = Object.values(zip.files).filter(
      (f) => !f.dir && /\.json$/i.test(f.name) && !f.name.includes('__MACOSX'),
    )
    if (jsonFiles.length === 0) {
      throw new Error('No Day One JSON found in the archive. Is this a Day One JSON export?')
    }

    // Index photo files by md5 (their basename without extension).
    for (const f of Object.values(zip.files)) {
      if (f.dir || f.name.includes('__MACOSX')) continue
      if (!/\/photos?\//i.test('/' + f.name)) continue
      const base = f.name.split('/').pop() ?? f.name
      const md5 = base.replace(/\.[^.]+$/, '').toLowerCase()
      if (md5) photoByMd5.set(md5, f)
    }

    for (const jf of jsonFiles) {
      try {
        const parsed = JSON.parse(await jf.async('string')) as DayOneJournal
        if (Array.isArray(parsed.entries)) allEntries.push(...parsed.entries)
      } catch {
        warnings.push(`Could not parse ${jf.name}`)
      }
    }
  } else {
    // Raw JSON export (text-only, no media).
    onProgress?.({ phase: 'reading', current: 0, total: 0 })
    try {
      const parsed = JSON.parse(await (file as Blob).text()) as DayOneJournal
      if (Array.isArray(parsed.entries)) allEntries.push(...parsed.entries)
      else throw new Error('missing entries[]')
    } catch (err) {
      throw new Error(
        `Could not read the file as a Day One export (.zip or .json): ${err instanceof Error ? err.message : String(err)}`,
      )
    }
  }

  let entriesImported = 0
  let photosImported = 0
  const total = allEntries.length

  for (let i = 0; i < allEntries.length; i++) {
    const e = allEntries[i]
    onProgress?.({ phase: 'importing', current: i + 1, total })
    try {
      const rawText = stripMomentRefs(e.text ?? '')
      const { title, body } = splitTitle(rawText)
      const content = markdownToTipTap(body)
      const createdAt = Date.parse(e.creationDate)
      const updatedAt = e.modifiedDate ? Date.parse(e.modifiedDate) : createdAt

      const entryId = dayOneIdToUuid(e.uuid)
      await entriesRepo.importEntry({
        id: entryId,
        userId,
        title,
        content,
        journalDate: journalDateFromIso(e.creationDate, e.timeZone),
        createdAt: Number.isNaN(createdAt) ? Date.now() : createdAt,
        updatedAt: Number.isNaN(updatedAt) ? Date.now() : updatedAt,
      })
      entriesImported++

      const photos = e.photos ?? []
      for (let p = 0; p < photos.length; p++) {
        const photo = photos[p]
        const zObj = photoByMd5.get((photo.md5 ?? '').toLowerCase())
        if (!zObj) {
          warnings.push(`Missing photo file for entry ${e.uuid} (md5 ${photo.md5})`)
          continue
        }
        const buf = await zObj.async('arraybuffer')
        const mime = mimeForType(photo.type)
        const blob = new Blob([buf], { type: mime })
        await photosRepo.addImported({
          id: dayOneIdToUuid(photo.identifier || photo.md5),
          entryId,
          userId,
          blob,
          mimeType: mime,
          width: photo.width ?? 0,
          height: photo.height ?? 0,
          order: photo.orderInEntry ?? p,
          createdAt: Number.isNaN(createdAt) ? Date.now() : createdAt,
        })
        photosImported++
      }
    } catch (err) {
      warnings.push(`Failed to import entry ${e.uuid}: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  // Kick a background sync to push everything to Supabase.
  syncEngine.requestSync('import')

  return { entries: entriesImported, photos: photosImported, warnings }
}

/** Sniff the ZIP magic number ("PK") so we can accept raw .json exports too. */
async function looksLikeZip(file: File | Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, 2).arrayBuffer())
  return head[0] === 0x50 && head[1] === 0x4b
}
