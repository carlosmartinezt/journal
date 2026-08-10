import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useTimeline, groupByDate, buildYearIndex } from '../hooks/useTimeline'
import { useNewEntry } from '../components/NewEntry'
import { EntryCard } from '../components/EntryCard'
import { formatDateHeader, parseJournalDate } from '../lib/date'
import { YearMonthList, TimelineNavDrawer, monthAnchorId } from '../components/TimelineNav'

/** How many entries to render initially and per "load more" step. */
const PAGE = 40

/**
 * The home screen: entries reverse-chronologically, grouped by day. Rendered
 * progressively — only a window of entries is mounted at a time, and more load
 * as you scroll — so a large history stays fast. A year/month jump nav scrolls
 * to a chosen month, expanding the window first if that month isn't mounted yet.
 */
export function TimelinePage() {
  const { user } = useAuth()
  const { entries, loading, count } = useTimeline(user?.id)
  const { open } = useNewEntry()
  const [navOpen, setNavOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE)

  const sentinelRef = useRef<HTMLDivElement>(null)
  const pendingAnchor = useRef<string | null>(null)

  // Full index (cheap — dates only, no cards) drives the jump nav.
  const index = useMemo(() => buildYearIndex(entries), [entries])
  const totalMonths = index.reduce((n, y) => n + y.months.length, 0)
  const showNav = totalMonths > 1

  // Only the windowed slice is grouped + rendered.
  const visible = useMemo(() => entries.slice(0, visibleCount), [entries, visibleCount])
  const groups = useMemo(() => groupByDate(visible), [visible])

  // Anchor id for the first rendered day-group of each month.
  const anchors = useMemo(() => {
    const map = new Map<number, string>()
    const seen = new Set<string>()
    groups.forEach((g, i) => {
      const d = parseJournalDate(g.journalDate)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      if (!seen.has(key)) {
        seen.add(key)
        map.set(i, monthAnchorId(d.getFullYear(), d.getMonth()))
      }
    })
    return map
  }, [groups])

  const hasMore = visibleCount < count

  // Infinite scroll: grow the window as the sentinel nears the viewport.
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

  // After the window expands for a jump, scroll to the now-mounted anchor.
  useEffect(() => {
    if (!pendingAnchor.current) return
    const id = pendingAnchor.current
    pendingAnchor.current = null
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [visibleCount])

  const jump = (year: number, month: number) => {
    setNavOpen(false)
    const targetIdx = entries.findIndex((e) => {
      const d = parseJournalDate(e.journalDate)
      return d.getFullYear() === year && d.getMonth() === month
    })
    if (targetIdx === -1) return
    const id = monthAnchorId(year, month)
    if (targetIdx >= visibleCount) {
      // Expand the window to include the target month, then scroll (effect).
      pendingAnchor.current = id
      setVisibleCount(Math.min(count, targetIdx + PAGE))
    } else {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  if (loading) {
    return <div className="px-6 py-16 text-center font-serif text-ink-faint">Loading…</div>
  }

  if (count === 0) return <EmptyState onNew={open} />

  return (
    <div className="px-2">
      <header className="flex items-center justify-between px-4 pb-2 pt-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Journal</h1>
        {showNav && (
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Jump to date"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-soft active:bg-line xl:hidden"
          >
            <CalendarIcon />
          </button>
        )}
      </header>

      {groups.map((group, i) => (
        <Fragment key={group.journalDate}>
          {anchors.has(i) && <div id={anchors.get(i)} className="scroll-mt-4" aria-hidden />}
          <section className="mb-4">
            <h2 className="sticky top-0 z-10 bg-paper/90 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink-faint backdrop-blur-sm">
              {formatDateHeader(group.journalDate)}
            </h2>
            <div className="divide-y divide-line/70">
              {group.entries.map((entry) => (
                <EntryCard key={entry.id} entry={entry} />
              ))}
            </div>
          </section>
        </Fragment>
      ))}

      {/* Infinite-scroll sentinel + subtle loading hint. */}
      {hasMore && (
        <div ref={sentinelRef} className="py-6 text-center text-xs text-ink-faint">
          Loading earlier entries…
        </div>
      )}

      {/* Persistent rail on wide screens (sits in the left gutter). */}
      {showNav && (
        <aside className="fixed left-6 top-28 hidden max-h-[68vh] w-44 overflow-y-auto xl:block">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-faint">Jump to</p>
          <YearMonthList index={index} onJump={jump} />
        </aside>
      )}

      {/* Slide-in drawer on phones. */}
      <TimelineNavDrawer index={index} open={navOpen} onClose={() => setNavOpen(false)} onJump={jump} />
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
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
