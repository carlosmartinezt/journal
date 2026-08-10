/**
 * Year/month jump navigation for a long timeline. Rendered as a persistent
 * left rail on wide screens and a slide-in drawer on phones (the app is
 * mobile-first, so a permanent sidebar would crowd the writing surface).
 */

export interface YearIndex {
  year: number
  /** Months present that year, as 0-based indexes, newest first. */
  months: number[]
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** DOM id for the anchor placed before the first day-group of a month. */
export function monthAnchorId(year: number, month: number): string {
  return `m-${year}-${month}`
}

export function YearMonthList({
  index,
  onJump,
}: {
  index: YearIndex[]
  onJump: (anchorId: string) => void
}) {
  return (
    <nav className="space-y-4">
      {index.map(({ year, months }) => (
        <div key={year}>
          <button
            onClick={() => onJump(monthAnchorId(year, months[0]))}
            className="mb-1.5 font-serif text-base font-semibold text-ink"
          >
            {year}
          </button>
          <div className="flex flex-wrap gap-1">
            {months.map((m) => (
              <button
                key={m}
                onClick={() => onJump(monthAnchorId(year, m))}
                className="rounded-md px-1.5 py-0.5 text-xs text-ink-soft transition-colors hover:bg-line active:bg-line"
              >
                {MONTHS[m]}
              </button>
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

/** Mobile slide-in drawer wrapping the year/month list. */
export function TimelineNavDrawer({
  index,
  open,
  onClose,
  onJump,
}: {
  index: YearIndex[]
  open: boolean
  onClose: () => void
  onJump: (anchorId: string) => void
}) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-40 xl:hidden">
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] animate-fadein" onClick={onClose} />
      <div
        className="absolute left-0 top-0 flex h-full w-64 flex-col border-r border-line bg-paper-raised shadow-2xl animate-fadein"
        style={{ paddingTop: 'var(--sat)' }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-xs font-semibold uppercase tracking-widest text-ink-faint">Jump to</span>
          <button onClick={onClose} aria-label="Close" className="text-ink-faint">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-8">
          <YearMonthList index={index} onJump={onJump} />
        </div>
      </div>
    </div>
  )
}
