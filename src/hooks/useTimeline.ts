import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/local/db'
import type { Entry } from '../types'

export interface TimelineGroup {
  journalDate: string
  entries: Entry[]
}

export interface TimelineResult {
  groups: TimelineGroup[]
  loading: boolean
  count: number
}

/**
 * Reactive timeline: all of a user's non-deleted entries, grouped by journal
 * date (newest day first) and, within a day, newest entry first. Reads live
 * from IndexedDB so it updates instantly on any local write — no network.
 */
export function useTimeline(userId: string | undefined): TimelineResult {
  const entries = useLiveQuery(
    async () => {
      if (!userId) return [] as Entry[]
      const all = await db.entries.where('userId').equals(userId).toArray()
      return all
        .filter((e) => !e.deletedAt)
        .sort((a, b) => b.createdAt - a.createdAt)
    },
    [userId],
    undefined, // undefined => still loading
  )

  if (entries === undefined) {
    return { groups: [], loading: true, count: 0 }
  }

  const byDate = new Map<string, Entry[]>()
  for (const e of entries) {
    const list = byDate.get(e.journalDate) ?? []
    list.push(e)
    byDate.set(e.journalDate, list)
  }
  const groups: TimelineGroup[] = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1)) // date desc
    .map(([journalDate, list]) => ({ journalDate, entries: list }))

  return { groups, loading: false, count: entries.length }
}
