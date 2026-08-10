import { useMemo } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useTimeline } from '../hooks/useTimeline'
import { EntryRow } from '../components/EntryRow'
import { toJournalDate, formatMonthDay } from '../lib/date'
import type { Entry } from '../types'

/**
 * "On This Day": every entry written on today's calendar day (same month +
 * day) across all years, grouped by year — a gentle way to revisit the past.
 */
export function OnThisDayPage() {
  const { user } = useAuth()
  const { entries, loading } = useTimeline(user?.id)

  const todayKey = toJournalDate()
  const monthDay = todayKey.slice(5) // MM-DD

  // Entries matching today's month+day, grouped by year (newest year first).
  const byYear = useMemo(() => {
    const matches = entries.filter((e) => e.journalDate.slice(5) === monthDay)
    const map = new Map<string, Entry[]>()
    for (const e of matches) {
      const year = e.journalDate.slice(0, 4)
      const list = map.get(year) ?? []
      list.push(e)
      map.set(year, list)
    }
    return [...map.entries()]
      .sort((a, b) => (a[0] < b[0] ? 1 : -1))
      .map(([year, list]) => ({
        year,
        entries: list.sort((a, b) => b.createdAt - a.createdAt),
      }))
  }, [entries, monthDay])

  return (
    <div>
      <header className="px-4 pb-3 pt-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">On This Day</h1>
        <p className="mt-0.5 text-sm text-ink-faint">{formatMonthDay(todayKey)}</p>
      </header>

      {loading ? (
        <div className="px-6 py-16 text-center font-serif text-ink-faint">Loading…</div>
      ) : byYear.length === 0 ? (
        <div className="mx-auto max-w-sm px-8 py-20 text-center">
          <div className="mb-4 font-serif text-4xl">🕰️</div>
          <p className="font-serif text-lg text-ink-soft">Nothing from this day yet.</p>
          <p className="mt-1 font-serif text-ink-faint">
            Come back next year — today’s entries will appear here.
          </p>
        </div>
      ) : (
        byYear.map((group) => (
          <section key={group.year} className="mb-3">
            <h2 className="sticky top-0 z-10 border-y border-line bg-paper/95 px-4 py-1.5 font-serif text-base font-semibold text-ink backdrop-blur-sm">
              {group.year}
            </h2>
            {group.entries.map((entry) => (
              <div key={entry.id} className="border-b border-line/50">
                <EntryRow entry={entry} showDate={false} />
              </div>
            ))}
          </section>
        ))
      )}
    </div>
  )
}
