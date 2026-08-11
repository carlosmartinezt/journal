import { useAuth } from '../auth/AuthContext'

/**
 * A quiet strip marking the sample journal, with the way out. It scrolls away
 * with the content rather than sticking — the timeline and calendar already
 * have sticky headers, and the demo shouldn't shout over them. Settings keeps
 * a permanent exit for anyone who scrolls past this.
 */
export function DemoBanner() {
  const { isDemo, signOut } = useAuth()
  if (!isDemo) return null

  return (
    <div className="flex items-center gap-3 border-b border-line bg-accent-soft px-4 py-2">
      <p className="min-w-0 flex-1 text-xs leading-snug text-ink-soft">
        <span className="font-semibold text-ink">Demo</span> · sample entries, stored only on this
        device. Write, edit, delete — nothing is saved anywhere else.
      </p>
      <button
        onClick={() => void signOut()}
        className="shrink-0 rounded-lg border border-line bg-paper px-2.5 py-1 text-xs font-medium text-ink active:bg-line"
      >
        Exit
      </button>
    </div>
  )
}
