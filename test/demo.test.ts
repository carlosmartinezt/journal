import { describe, expect, it } from 'vitest'
import { db } from '../src/db/local/db'
import { queue } from '../src/db/local/queue'
import { meta } from '../src/db/local/meta'
import { entriesRepo } from '../src/db/local/entriesRepo'
import {
  DEMO_ENTRY_COUNT,
  DEMO_USER_ID,
  buildDemoData,
  enterDemo,
  exitDemo,
  resolveDate,
  toDoc,
} from '../src/demo/session'
import { DEMO_ENTRIES } from '../src/demo/entries'
import { toJournalDate } from '../src/lib/date'
import { docToPlainText } from '../src/lib/content'

const NOW = new Date(2026, 7, 11, 12, 0, 0) // 11 Aug 2026, local

async function reset() {
  await db.entries.clear()
  await db.photos.clear()
  await db.syncQueue.clear()
  await db.appMeta.clear()
}

describe('demo dataset', () => {
  it('builds every sample entry with searchable text and a real date', () => {
    const { entries } = buildDemoData(NOW)
    expect(entries).toHaveLength(DEMO_ENTRY_COUNT)

    for (const e of entries) {
      expect(e.userId).toBe(DEMO_USER_ID)
      expect(e.journalDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(e.plainText.length).toBeGreaterThan(0)
      expect(e.deletedAt).toBeNull()
      // Sample data must never look like it's waiting to be pushed.
      expect(e.syncStatus).toBe('synced')
    }
  })

  it('never dates an entry in the future', () => {
    const today = toJournalDate(NOW.getTime())
    for (const e of buildDemoData(NOW).entries) {
      expect(e.journalDate <= today).toBe(true)
    }
  })

  it('covers today, this week, and the same date in earlier years', () => {
    const { entries } = buildDemoData(NOW)
    const dates = new Set(entries.map((e) => e.journalDate))
    expect(dates.has('2026-08-11')).toBe(true) // today
    expect(dates.has('2026-08-10')).toBe(true) // yesterday

    // "On this day" needs matching month+day in previous years.
    const monthDay = '08-11'
    const earlierYears = entries.filter(
      (e) => e.journalDate.slice(5) === monthDay && e.journalDate.slice(0, 4) !== '2026',
    )
    expect(earlierYears.length).toBeGreaterThanOrEqual(2)
  })

  it('spans enough distinct months to fill the calendar', () => {
    const months = new Set(buildDemoData(NOW).entries.map((e) => e.journalDate.slice(0, 7)))
    expect(months.size).toBeGreaterThanOrEqual(12)
  })

  it('lists day-relative entries oldest-last, so trips read in order', () => {
    // The file is written newest-first. Within the day-relative entries the
    // offsets must therefore only grow — this is what catches a multi-day trip
    // whose "second day" was accidentally dated before its arrival.
    const offsets = DEMO_ENTRIES.filter((s) => s.d != null && s.w == null).map((s) => s.d!)
    for (let i = 1; i < offsets.length; i++) {
      expect(offsets[i]).toBeGreaterThanOrEqual(offsets[i - 1])
    }
  })

  it('has days holding more than one entry', () => {
    const perDay = new Map<string, number>()
    for (const e of buildDemoData(NOW).entries) {
      perDay.set(e.journalDate, (perDay.get(e.journalDate) ?? 0) + 1)
    }
    expect([...perDay.values()].some((n) => n > 1)).toBe(true)
  })

  it('attaches illustrated photos to some entries', () => {
    const { entries, photos } = buildDemoData(NOW)
    expect(photos.length).toBeGreaterThan(5)
    const ids = new Set(entries.map((e) => e.id))
    for (const p of photos) {
      expect(ids.has(p.entryId)).toBe(true)
      expect(p.blob!.size).toBeGreaterThan(200)
      expect(p.userId).toBe(DEMO_USER_ID)
    }
  })

  it('is stable across builds, so re-entering the demo cannot duplicate it', () => {
    const a = buildDemoData(NOW).entries.map((e) => e.id)
    const b = buildDemoData(NOW).entries.map((e) => e.id)
    expect(a).toEqual(b)
    expect(new Set(a).size).toBe(a.length)
  })
})

describe('demo markup', () => {
  it('converts headings, quotes and consecutive bullets', () => {
    const doc = toDoc(['## Title', 'A line.', '- one', '- two', '> quoted'])
    const types = doc.content!.map((n: { type: string }) => n.type)
    expect(types).toEqual(['heading', 'paragraph', 'bulletList', 'blockquote'])

    const list = doc.content![2] as { content: unknown[] }
    expect(list.content).toHaveLength(2)
    expect(docToPlainText(doc)).toContain('quoted')
  })

  it('dates yearsAgo entries on the same month and day', () => {
    const ts = resolveDate({ yearsAgo: 2, t: '09:30', body: [] }, NOW)
    expect(toJournalDate(ts)).toBe('2024-08-11')
  })

  it('pins seasonal entries to the most recent occurrence of their date', () => {
    // Already passed this year → this year's.
    expect(toJournalDate(resolveDate({ md: '04-18', t: '09:00', body: [] }, NOW))).toBe('2026-04-18')
    // Still to come this year → last year's, never the future.
    expect(toJournalDate(resolveDate({ md: '12-06', t: '09:00', body: [] }, NOW))).toBe('2025-12-06')
    // `back` steps further into the past.
    expect(
      toJournalDate(resolveDate({ md: '10-12', back: 1, t: '09:00', body: [] }, NOW)),
    ).toBe('2024-10-12')
  })

  it('snaps weekday-specific entries backwards to that weekday', () => {
    // 11 Aug 2026 is a Tuesday; six days back is Wed 5 Aug, so a "Saturday"
    // entry must slide back to Sat 1 Aug rather than lie about the day.
    const ts = resolveDate({ d: 6, w: 6, t: '10:45', body: [] }, NOW)
    expect(new Date(ts).getDay()).toBe(6)
    expect(toJournalDate(ts)).toBe('2026-08-01')
  })
})

describe('demo session lifecycle', () => {
  it('seeds without queueing any sync work', async () => {
    await reset()
    await enterDemo(NOW)

    expect(await db.entries.where('userId').equals(DEMO_USER_ID).count()).toBe(DEMO_ENTRY_COUNT)
    expect(await queue.count()).toBe(0)
    expect(await meta.getDemoMode()).toBe(true)
    expect((await meta.getCachedUser())?.id).toBe(DEMO_USER_ID)
  })

  it('re-entering refreshes in place rather than duplicating', async () => {
    await reset()
    await enterDemo(NOW)
    await enterDemo(new Date(2026, 7, 12, 12, 0, 0))
    expect(await db.entries.where('userId').equals(DEMO_USER_ID).count()).toBe(DEMO_ENTRY_COUNT)
  })

  it('exiting erases the sample data, the visitor’s edits, and their queued ops', async () => {
    await reset()
    await enterDemo(NOW)

    // A visitor writes something of their own, which does queue a push.
    const mine = await entriesRepo.create({ userId: DEMO_USER_ID, title: 'Mine' })
    expect(await queue.count()).toBeGreaterThan(0)

    await exitDemo()

    expect(await db.entries.count()).toBe(0)
    expect(await db.photos.count()).toBe(0)
    // Critical: nothing may follow the visitor into a real account.
    expect(await queue.count()).toBe(0)
    expect(await db.entries.get(mine.id)).toBeUndefined()
    expect(await meta.getDemoMode()).toBe(false)
    expect(await meta.getCachedUser()).toBeNull()
  })
})
