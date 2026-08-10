import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/local/db'
import type { Entry } from '../types'

export interface TimelineGroup {
  journalDate: string
  entries: Entry[]
}

export interface TimelineData {
  /** Full list, sorted journalDate desc then createdAt desc. */
  entries: Entry[]
  loading: boolean
  count: number
}

/**
 * Reactive timeline data: all of a user's non-deleted entries as a single
 * sorted list. The page renders this progressively (windowed) so a large
 * history doesn't mount thousands of cards at once. Reads live from IndexedDB.
 */
export function useTimeline(userId: string | undefined): TimelineData {
  const entries = useLiveQuery(
    async () => {
      if (!userId) return [] as Entry[]
      const all = await db.entries.where('userId').equals(userId).toArray()
      return all
        .filter((e) => !e.deletedAt)
        .sort((a, b) =>
          a.journalDate === b.journalDate
            ? b.createdAt - a.createdAt
            : a.journalDate < b.journalDate
              ? 1
              : -1,
        )
    },
    [userId],
    undefined, // undefined => still loading
  )

  if (entries === undefined) return { entries: [], loading: true, count: 0 }
  return { entries, loading: false, count: entries.length }
}

/** Group an already-sorted entry list into consecutive day-groups. */
export function groupByDate(entries: Entry[]): TimelineGroup[] {
  const groups: TimelineGroup[] = []
  let current: TimelineGroup | null = null
  for (const e of entries) {
    if (!current || current.journalDate !== e.journalDate) {
      current = { journalDate: e.journalDate, entries: [] }
      groups.push(current)
    }
    current.entries.push(e)
  }
  return groups
}
