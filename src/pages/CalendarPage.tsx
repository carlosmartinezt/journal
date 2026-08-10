import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useTimeline } from '../hooks/useTimeline'
import { toJournalDate, toDateKey, formatMonthYear, monthGrid } from '../lib/date'

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const MONTHS_PER_PAGE = 8

/**
 * A vertically scrolling calendar: one grid per month, newest at top. Days with
 * entries are filled and tappable (→ that day's entries); today is ringed.
 * Months render progressively so a long history stays light.
 */
export function CalendarPage() {
  const { user } = useAuth()
  const { entries, loading } = useTimeline(user?.id)
  const navigate = useNavigate()
  const sentinelRef = useRef<HTMLDivElement>(null)
  const [visibleMonths, setVisibleMonths] = useState(MONTHS_PER_PAGE)

  const daysWithEntries = useMemo(() => new Set(entries.map((e) => e.journalDate)), [entries])
  const today = toJournalDate()

  // Months from the current month back to the oldest entry's month.
  const months = useMemo(() => {
    const now = new Date()
    let y = now.getFullYear()
    let m = now.getMonth()
    const oldest = entries.length ? entries[entries.length - 1].journalDate : today
    const oy = Number(oldest.slice(0, 4))
    const om = Number(oldest.slice(5, 7)) - 1
    const list: { year: number; month: number }[] = []
    while (y > oy || (y === oy && m >= om)) {
      list.push({ year: y, month: m })
      m -= 1
      if (m < 0) {
        m = 11
        y -= 1
      }
    }
    return list
  }, [entries, today])

  const shown = months.slice(0, visibleMonths)
  const hasMore = visibleMonths < months.length

  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) setVisibleMonths((n) => Math.min(months.length, n + MONTHS_PER_PAGE))
      },
      { rootMargin: '600px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [months.length, hasMore])

  if (loading) {
    return <div className="px-6 py-16 text-center font-serif text-ink-faint">Loading…</div>
  }

  return (
    <div>
      <header className="px-4 pb-2 pt-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Calendar</h1>
      </header>

      {/* Weekday header (sticky). */}
      <div className="sticky top-0 z-10 grid grid-cols-7 border-y border-line bg-paper/95 backdrop-blur-sm">
        {WEEKDAYS.map((d, i) => (
          <div key={i} className="py-1.5 text-center text-[11px] font-semibold uppercase text-ink-faint">
            {d}
          </div>
        ))}
      </div>

      {shown.map(({ year, month }) => (
        <section key={`${year}-${month}`} className="px-2 pb-4">
          <h2 className="px-2 pb-1 pt-3 font-serif text-base font-semibold text-ink">
            {formatMonthYear(toDateKey(year, month, 1))}
          </h2>
          <div className="grid grid-cols-7">
            {monthGrid(year, month).flat().map((day, i) => {
              if (day === null) return <div key={i} className="aspect-square" />
              const key = toDateKey(year, month, day)
              const has = daysWithEntries.has(key)
              const isToday = key === today
              return (
                <div key={i} className="flex aspect-square items-center justify-center p-0.5">
                  <button
                    disabled={!has}
                    onClick={() => navigate(`/day/${key}`)}
                    className={[
                      'flex h-full w-full items-center justify-center rounded-lg text-sm',
                      has ? 'bg-accent-soft font-semibold text-ink active:bg-accent/30' : 'text-ink-faint',
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

      {hasMore && <div ref={sentinelRef} className="py-6 text-center text-xs text-ink-faint">…</div>}
    </div>
  )
}
