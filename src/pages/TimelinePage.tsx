import { useAuth } from '../auth/AuthContext'
import { useTimeline } from '../hooks/useTimeline'
import { useNewEntry } from '../components/NewEntry'
import { EntryCard } from '../components/EntryCard'
import { formatDateHeader } from '../lib/date'

/**
 * The home screen: entries in reverse-chronological order, grouped by day.
 * Reads entirely from IndexedDB, so it's identical online and offline.
 */
export function TimelinePage() {
  const { user } = useAuth()
  const { groups, loading, count } = useTimeline(user?.id)
  const { open } = useNewEntry()

  if (loading) {
    return <div className="px-6 py-16 text-center font-serif text-ink-faint">Loading…</div>
  }

  if (count === 0) return <EmptyState onNew={open} />

  return (
    <div className="px-2">
      <header className="px-4 pb-2 pt-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Journal</h1>
      </header>

      {groups.map((group) => (
        <section key={group.journalDate} className="mb-4">
          <h2 className="sticky top-0 z-10 bg-paper/90 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-ink-faint backdrop-blur-sm">
            {formatDateHeader(group.journalDate)}
          </h2>
          <div className="divide-y divide-line/70">
            {group.entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </section>
      ))}
    </div>
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
