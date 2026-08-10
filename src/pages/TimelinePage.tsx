import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useTimeline, groupByDate } from '../hooks/useTimeline'
import { useNewEntry } from '../components/NewEntry'
import { EntryRow } from '../components/EntryRow'
import { formatMonthYear, monthKey } from '../lib/date'

/** How many entries to render initially and per "load more" step. */
const PAGE = 40

/**
 * Home screen: entries reverse-chronologically with sticky month separators
 * and a per-day date rail. Rendered progressively (windowed) for large
 * histories; more load as you scroll.
 */
export function TimelinePage() {
  const { user } = useAuth()
  const { entries, loading, count } = useTimeline(user?.id)
  const { open } = useNewEntry()
  const navigate = useNavigate()
  const [visibleCount, setVisibleCount] = useState(PAGE)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => entries.slice(0, visibleCount), [entries, visibleCount])
  const groups = useMemo(() => groupByDate(visible), [visible])

  // Group indices that begin a new month → get a month separator.
  const monthStarts = useMemo(() => {
    const s = new Set<number>()
    let last = ''
    groups.forEach((g, i) => {
      const mk = monthKey(g.journalDate)
      if (mk !== last) {
        s.add(i)
        last = mk
      }
    })
    return s
  }, [groups])

  const yearRange = useMemo(() => {
    if (!entries.length) return ''
    const newest = entries[0].journalDate.slice(0, 4)
    const oldest = entries[entries.length - 1].journalDate.slice(0, 4)
    return newest === oldest ? newest : `${oldest}–${newest}`
  }, [entries])

  const hasMore = visibleCount < count
  useEffect(() => {
    const el = sentinelRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (es) => {
        if (es[0].isIntersecting) setVisibleCount((c) => Math.min(count, c + PAGE))
      },
      { rootMargin: '800px' },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [count, hasMore])

  if (loading) {
    return <div className="px-6 py-16 text-center font-serif text-ink-faint">Loading…</div>
  }
  if (count === 0) return <EmptyState onNew={open} />

  return (
    <div>
      <header className="flex items-start justify-between px-4 pb-3 pt-6">
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Journal</h1>
          {yearRange && <p className="mt-0.5 text-sm text-ink-faint">{yearRange}</p>}
        </div>
        <button
          onClick={() => navigate('/search')}
          aria-label="Search"
          className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft active:bg-line"
        >
          <SearchIcon />
        </button>
      </header>

      {groups.map((group, gi) => (
        <Fragment key={group.journalDate}>
          {monthStarts.has(gi) && (
            <h2 className="sticky top-0 z-10 border-y border-line bg-paper/95 px-4 py-1.5 font-serif text-base font-semibold text-ink backdrop-blur-sm">
              {formatMonthYear(group.journalDate)}
            </h2>
          )}
          {group.entries.map((entry, ei) => (
            <div key={entry.id} className="border-b border-line/50">
              <EntryRow entry={entry} showDate={ei === 0} />
            </div>
          ))}
        </Fragment>
      ))}

      {hasMore && (
        <div ref={sentinelRef} className="py-6 text-center text-xs text-ink-faint">
          Loading earlier entries…
        </div>
      )}
    </div>
  )
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

function EmptyState({ onNew }: { onNew: () => void }) {
  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col items-center justify-center px-8 py-24 text-center">
      <div className="mb-6 font-serif text-5xl">✍️</div>
      <h2 className="font-serif text-2xl font-semibold text-ink">Your journal starts here.</h2>
      <p className="mt-2 font-serif text-ink-soft">Write what’s on your mind.</p>
      <button
        onClick={onNew}
        className="mt-8 rounded-full bg-ink px-6 py-3 font-medium text-paper transition-transform active:scale-95"
      >
        New Entry
      </button>
    </div>
  )
}
