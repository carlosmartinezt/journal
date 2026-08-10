import { Fragment, useMemo, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { useTimeline } from '../hooks/useTimeline'
import { useNewEntry } from '../components/NewEntry'
import { EntryCard } from '../components/EntryCard'
import { formatDateHeader, parseJournalDate } from '../lib/date'
import {
  YearMonthList,
  TimelineNavDrawer,
  monthAnchorId,
  type YearIndex,
} from '../components/TimelineNav'

/**
 * The home screen: entries in reverse-chronological order, grouped by day.
 * For long histories, a year/month jump nav (persistent rail on wide screens,
 * slide-in drawer on phones) scrolls the timeline to a chosen month.
 */
export function TimelinePage() {
  const { user } = useAuth()
  const { groups, loading, count } = useTimeline(user?.id)
  const { open } = useNewEntry()
  const [navOpen, setNavOpen] = useState(false)

  // Year → months present (both newest-first) for the jump nav.
  const index = useMemo<YearIndex[]>(() => {
    const byYear = new Map<number, Set<number>>()
    for (const g of groups) {
      const d = parseJournalDate(g.journalDate)
      const set = byYear.get(d.getFullYear()) ?? new Set<number>()
      set.add(d.getMonth())
      byYear.set(d.getFullYear(), set)
    }
    return [...byYear.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([year, months]) => ({ year, months: [...months].sort((a, b) => b - a) }))
  }, [groups])

  // Which group index starts a new month → gets a scroll anchor.
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

  const totalMonths = index.reduce((n, y) => n + y.months.length, 0)
  const showNav = totalMonths > 1

  const jump = (anchorId: string) => {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    setNavOpen(false)
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
