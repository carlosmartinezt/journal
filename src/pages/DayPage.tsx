import { useMemo } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useTimeline } from '../hooks/useTimeline'
import { useCreateEntry } from '../hooks/useCreateEntry'
import { EntryRow } from '../components/EntryRow'
import { formatDayFull } from '../lib/date'

/** All entries for a single day (reached from the calendar). */
export function DayPage() {
  const { date = '' } = useParams<{ date: string }>()
  const { user } = useAuth()
  const { entries, loading } = useTimeline(user?.id)
  const navigate = useNavigate()
  const createEntry = useCreateEntry()

  const dayEntries = useMemo(
    () => entries.filter((e) => e.journalDate === date).sort((a, b) => b.createdAt - a.createdAt),
    [entries, date],
  )

  // A day with a single entry opens that entry directly (also covers deep links).
  if (!loading && dayEntries.length === 1) {
    return <Navigate to={`/entry/${dayEntries[0].id}`} replace />
  }

  return (
    <div>
      <header className="flex items-center justify-between border-b border-line px-3 py-2 pt-6">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-ink-soft active:bg-line"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <h1 className="truncate px-2 text-center font-serif text-lg font-semibold text-ink">
          {date && formatDayFull(date)}
        </h1>
        <button
          onClick={() => void createEntry(date)}
          aria-label="New entry on this day"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft active:bg-line"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      </header>

      {loading ? (
        <div className="px-6 py-16 text-center font-serif text-ink-faint">Loading…</div>
      ) : dayEntries.length === 0 ? (
        <div className="px-6 py-16 text-center font-serif text-ink-faint">No entries on this day.</div>
      ) : (
        dayEntries.map((entry) => (
          <div key={entry.id} className="border-b border-line/50">
            <EntryRow entry={entry} showDate={false} />
          </div>
        ))
      )}
    </div>
  )
}
