import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { useCreateEntry } from '../hooks/useCreateEntry'
import { toJournalDate, formatDateHeader, formatShortDate } from '../lib/date'

/**
 * New-entry flow with a date picker at the creation step. Tapping ＋ opens a
 * calm bottom sheet defaulting to today; the writer can backdate the entry
 * before starting to write. A "Today" shortcut keeps the common path one tap.
 */
interface NewEntryContextValue {
  open: () => void
}
const NewEntryContext = createContext<NewEntryContextValue | null>(null)

export function NewEntryProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const open = useCallback(() => setIsOpen(true), [])
  const close = useCallback(() => setIsOpen(false), [])

  return (
    <NewEntryContext.Provider value={{ open }}>
      {children}
      {isOpen && <NewEntrySheet onClose={close} />}
    </NewEntryContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNewEntry(): NewEntryContextValue {
  const ctx = useContext(NewEntryContext)
  if (!ctx) throw new Error('useNewEntry must be used within NewEntryProvider')
  return ctx
}

function NewEntrySheet({ onClose }: { onClose: () => void }) {
  const createEntry = useCreateEntry()
  const today = toJournalDate()
  const [date, setDate] = useState(today)

  const start = async () => {
    onClose()
    await createEntry(date)
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center">
      {/* Scrim */}
      <div className="absolute inset-0 bg-ink/30 backdrop-blur-[2px] animate-fadein" onClick={onClose} />

      {/* Sheet */}
      <div
        className="relative z-10 w-full max-w-2xl rounded-t-3xl border-t border-line bg-paper-raised px-6 pt-3 pb-8 shadow-2xl animate-fadein"
        style={{ paddingBottom: 'calc(var(--sab) + 1.5rem)' }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line" />
        <h2 className="mb-1 font-serif text-xl font-semibold text-ink">New entry</h2>
        <p className="mb-5 text-sm text-ink-soft">Choose a date, then start writing.</p>

        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-ink-faint">
          Date
        </label>
        <div className="relative mb-5 flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-3">
          <div className="flex items-center gap-2">
            <CalendarIcon />
            <span className="font-medium text-ink">{formatDateHeader(date)}</span>
            {(formatDateHeader(date) === 'Today' || formatDateHeader(date) === 'Yesterday') && (
              <span className="text-sm text-ink-faint">· {formatShortDate(date)}</span>
            )}
          </div>
          {date !== today && (
            <button
              onClick={() => setDate(today)}
              className="text-xs font-medium text-accent"
              type="button"
            >
              Today
            </button>
          )}
          <input
            type="date"
            value={date}
            onChange={(e) => e.target.value && setDate(e.target.value)}
            aria-label="Entry date"
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        </div>

        <button
          onClick={start}
          className="w-full rounded-xl bg-ink py-3.5 font-medium text-paper transition-transform active:scale-[0.98]"
        >
          Start writing
        </button>
      </div>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-ink-soft">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
