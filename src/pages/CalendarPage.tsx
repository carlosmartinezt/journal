import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useTimeline } from '../hooks/useTimeline'
import { useCreateEntry } from '../hooks/useCreateEntry'
import { toJournalDate, toDateKey, formatMonthYear, monthGrid } from '../lib/date'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

/**
 * A vertically scrolling calendar: one grid per month, oldest at top and the
 * current month at the bottom, so time flows downward consistently (days read
 * 1→31, and scrolling down moves forward in time). Opens scrolled to the
 * bottom (now); scroll up to travel into the past. Days with entries are filled
 * and tappable (→ that day's entries); today is ringed.
 */
export function CalendarPage() {
  const { user } = useAuth()
  const { entries, loading } = useTimeline(user?.id)
  const navigate = useNavigate()
  const createEntry = useCreateEntry()

  // Entry ids per day, so we can route: empty → new entry, one → that entry,
  // many → the day list.
  const idsByDay = useMemo(() => {
    const m = new Map<string, string[]>()
    for (const e of entries) {
      const arr = m.get(e.journalDate) ?? []
      arr.push(e.id)
      m.set(e.journalDate, arr)
    }
    return m
  }, [entries])
  const today = toJournalDate()

  const openDay = (key: string) => {
    const ids = idsByDay.get(key)
    if (!ids || ids.length === 0) void createEntry(key)
    else if (ids.length === 1) navigate(`/entry/${ids[0]}`)
    else navigate(`/day/${key}`)
  }

  // Months ascending: from the oldest entry's month up to the current month.
  const months = useMemo(() => {
    const now = new Date()
    const endY = now.getFullYear()
    const endM = now.getMonth()
    const oldest = entries.length ? entries[entries.length - 1].journalDate : today
    let y = Number(oldest.slice(0, 4))
    let m = Number(oldest.slice(5, 7)) - 1
    const list: { year: number; month: number }[] = []
    while (y < endY || (y === endY && m <= endM)) {
      list.push({ year: y, month: m })
      m += 1
      if (m > 11) {
        m = 0
        y += 1
      }
    }
    return list
  }, [entries, today])

  if (loading) {
    return <div className="px-6 py-16 text-center font-serif text-ink-faint">Loading…</div>
  }

  return (
    <div>
      {/* Weekday header (sticky). */}
      <div className="sticky top-0 z-10 grid grid-cols-7 border-b border-line bg-paper/95 backdrop-blur-sm" style={{ paddingTop: 'var(--sat)' }}>
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-1.5 text-center text-[11px] font-semibold uppercase text-ink-faint">
            {d}
          </div>
        ))}
      </div>

      {months.map(({ year, month }) => (
        <section key={`${year}-${month}`} className="px-2 pb-4">
          <h2 className="px-2 pb-1 pt-4 font-serif text-base font-semibold text-ink">
            {formatMonthYear(toDateKey(year, month, 1))}
          </h2>
          <div className="grid grid-cols-7">
            {monthGrid(year, month).flat().map((day, i) => {
              if (day === null) return <div key={i} className="aspect-square" />
              const key = toDateKey(year, month, day)
              const has = idsByDay.has(key)
              const isToday = key === today
              return (
                <div key={i} className="flex aspect-square items-center justify-center p-0.5">
                  <button
                    onClick={() => openDay(key)}
                    aria-label={has ? `Entries on ${key}` : `New entry on ${key}`}
                    className={[
                      'flex h-full w-full items-center justify-center rounded-lg text-sm transition-colors',
                      has
                        ? 'bg-accent-soft font-semibold text-ink active:bg-accent/30'
                        : 'text-ink-faint active:bg-line',
                      isToday ? 'ring-2 ring-ink ring-inset' : '',
                    ].join(' ')}
                  >
                    {day}
                  </button>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
