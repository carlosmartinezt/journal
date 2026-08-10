import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useTimeline } from '../hooks/useTimeline'
import { EntryRow } from '../components/EntryRow'

const MAX_RESULTS = 200

/**
 * Full-text search over titles + body text. Entries already live in IndexedDB,
 * so this is an instant in-memory scan — no network, works offline.
 */
export function SearchPage() {
  const { user } = useAuth()
  const { entries } = useTimeline(user?.id)
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Precompute a lowercase haystack per entry so keystrokes stay cheap.
  const index = useMemo(
    () => entries.map((e) => ({ e, hay: `${e.title}\n${e.plainText}`.toLowerCase() })),
    [entries],
  )

  const query = q.trim().toLowerCase()
  const results = useMemo(() => {
    if (query.length < 2) return []
    const out = []
    for (const { e, hay } of index) {
      if (hay.includes(query)) out.push(e)
      if (out.length >= MAX_RESULTS) break
    }
    return out
  }, [index, query])

  return (
    <div>
      <header className="flex items-center gap-2 border-b border-line px-3 py-2 pt-6">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-soft active:bg-line"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your journal"
            className="w-full rounded-xl border border-line bg-paper-raised py-2.5 pl-9 pr-3 text-ink outline-none focus:border-accent"
          />
        </div>
      </header>

      {query.length < 2 ? (
        <p className="px-6 py-16 text-center font-serif text-ink-faint">
          Search titles and entries.
        </p>
      ) : results.length === 0 ? (
        <p className="px-6 py-16 text-center font-serif text-ink-faint">
          No entries match “{q.trim()}”.
        </p>
      ) : (
        <>
          <p className="px-4 py-2 text-xs text-ink-faint">
            {results.length}
            {results.length === MAX_RESULTS ? '+' : ''} result{results.length === 1 ? '' : 's'}
          </p>
          {results.map((entry) => (
            <div key={entry.id} className="border-b border-line/50">
              <EntryRow entry={entry} showFullDate />
            </div>
          ))}
        </>
      )}
    </div>
  )
}
