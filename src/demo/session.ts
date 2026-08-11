import { db } from '../db/local/db'
import { meta } from '../db/local/meta'
import { docToPlainText } from '../lib/content'
import { toJournalDate } from '../lib/date'
import { log } from '../lib/logger'
import { DEMO_ENTRIES, type DemoEntrySpec } from './entries'
import { SCENE_SIZE, sceneBlob } from './scenes'
import { DEMO_USER, DEMO_USER_ID } from './user'
import type { Entry, Photo, TipTapDoc } from '../types'

/**
 * The public demo: a fictional journal anyone can open without an account.
 *
 * It is deliberately a *local* session, not a shared Supabase account. The demo
 * seeds sample data straight into IndexedDB and never configures the sync
 * engine, which means:
 *   - visitors can write, edit and delete freely without touching real data
 *   - there is nothing public to vandalise and no backend quota to burn
 *   - the demo works offline, like the rest of the app
 * Everything a visitor does stays on their own device until they leave the
 * demo, at which point it is purged.
 */

export { DEMO_USER, DEMO_USER_ID }

/** Stable ids so re-seeding updates rows in place instead of duplicating. */
const entryId = (i: number) => `demo-entry-${String(i).padStart(4, '0')}`
const photoId = (i: number) => `demo-photo-${String(i).padStart(4, '0')}`

/**
 * Convert a spec's body lines into a TipTap document. Supports the small
 * subset of markup the sample entries use: headings, quotes and bullet lists.
 */
export function toDoc(body: string[]): TipTapDoc {
  const content: Record<string, unknown>[] = []
  let list: Record<string, unknown>[] | null = null

  const text = (value: string) => [{ type: 'text', text: value }]

  for (const line of body) {
    if (line.startsWith('- ')) {
      const item = {
        type: 'listItem',
        content: [{ type: 'paragraph', content: text(line.slice(2)) }],
      }
      if (list) list.push(item)
      else {
        list = [item]
        content.push({ type: 'bulletList', content: list })
      }
      continue
    }
    list = null

    if (line.startsWith('## ')) {
      content.push({ type: 'heading', attrs: { level: 2 }, content: text(line.slice(3)) })
    } else if (line.startsWith('> ')) {
      content.push({
        type: 'blockquote',
        content: [{ type: 'paragraph', content: text(line.slice(2)) }],
      })
    } else {
      content.push({ type: 'paragraph', content: text(line) })
    }
  }

  return { type: 'doc', content } as TipTapDoc
}

/**
 * Resolve a spec's relative date against "now" into a concrete timestamp.
 * Never returns a future date — a demo journal with entries from next month
 * would give the game away immediately.
 */
export function resolveDate(spec: DemoEntrySpec, now: Date): number {
  const [hours, minutes] = spec.t.split(':').map(Number)
  const date = new Date(now)

  if (spec.md) {
    const [month, day] = spec.md.split('-').map(Number)
    date.setMonth(month - 1, day)
    date.setHours(hours, minutes, 0, 0)
    // Later this year → that date hasn't happened yet; use last year's.
    if (date.getTime() > now.getTime()) date.setFullYear(date.getFullYear() - 1)
    if (spec.back) date.setFullYear(date.getFullYear() - spec.back)
  } else if (spec.yearsAgo != null) {
    date.setFullYear(date.getFullYear() - spec.yearsAgo)
  } else {
    date.setDate(date.getDate() - (spec.d ?? 0))
  }

  // Snap back to the weekday the entry talks about, if it names one.
  if (spec.w != null) {
    let guard = 7
    while (date.getDay() !== spec.w && guard-- > 0) date.setDate(date.getDate() - 1)
  }

  date.setHours(hours, minutes, 0, 0)
  return date.getTime()
}

/**
 * Build the demo dataset for a given "today". Pure — no database access — so
 * the shape of the sample journal is testable.
 */
export function buildDemoData(now: Date = new Date()): { entries: Entry[]; photos: Photo[] } {
  const entries: Entry[] = []
  const photos: Photo[] = []

  DEMO_ENTRIES.forEach((spec, i) => {
    const createdAt = resolveDate(spec, now)
    const content = toDoc(spec.body)
    entries.push({
      id: entryId(i),
      userId: DEMO_USER_ID,
      title: spec.title ?? '',
      content,
      plainText: docToPlainText(content),
      journalDate: toJournalDate(createdAt),
      createdAt,
      updatedAt: createdAt,
      serverUpdatedAt: null,
      deletedAt: null,
      // Sample data is never pushed anywhere, so it starts "settled" — nothing
      // queued, nothing pending, no misleading sync badges in the demo.
      syncStatus: 'synced',
    })

    if (spec.photo) {
      photos.push({
        id: photoId(i),
        entryId: entryId(i),
        userId: DEMO_USER_ID,
        blob: sceneBlob(spec.photo),
        mimeType: 'image/svg+xml',
        width: SCENE_SIZE.width,
        height: SCENE_SIZE.height,
        storagePath: null,
        createdAt,
        updatedAt: createdAt,
        deletedAt: null,
        syncStatus: 'synced',
        order: 0,
      })
    }
  })

  return { entries, photos }
}

/** Number of sample entries a fresh demo starts with. */
export const DEMO_ENTRY_COUNT = DEMO_ENTRIES.length

/**
 * Write the sample journal into IndexedDB. Idempotent: ids are stable, so
 * re-entering the demo refreshes the sample data (dates shift to stay recent)
 * without duplicating it. Entries the visitor wrote themselves are untouched.
 */
export async function seedDemo(now: Date = new Date()): Promise<void> {
  const { entries, photos } = buildDemoData(now)
  await db.transaction('rw', db.entries, db.photos, async () => {
    await db.entries.bulkPut(entries)
    await db.photos.bulkPut(photos)
  })
  log.debug('demo seeded', entries.length, 'entries')
}

/** Start the demo session: seed sample data and remember we're in it. */
export async function enterDemo(now: Date = new Date()): Promise<void> {
  await seedDemo(now)
  await meta.setDemoMode(true)
  await meta.setCachedUser(DEMO_USER)
}

/**
 * Leave the demo and erase every trace of it — the sample entries, the
 * visitor's own scribbles, and any sync ops those edits queued up (which must
 * never be allowed to follow them into a real account).
 */
export async function exitDemo(): Promise<void> {
  await db.transaction('rw', db.entries, db.photos, db.syncQueue, async () => {
    await db.entries.where('userId').equals(DEMO_USER_ID).delete()
    await db.photos.where('userId').equals(DEMO_USER_ID).delete()
    const queued = await db.syncQueue.filter((q) => q.userId === DEMO_USER_ID).toArray()
    await db.syncQueue.bulkDelete(queued.map((q) => q.id!))
  })
  await meta.setDemoMode(false)
  await meta.setCachedUser(null)
}
