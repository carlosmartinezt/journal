import { useOnline } from '../hooks/useOnline'
import { useSyncState } from '../hooks/useSyncState'

/**
 * A calm, non-alarming save/sync status line for the editor. Offline is a
 * normal state here — never an error banner.
 *
 * States: Saving… → (offline) Saved offline → (online) Syncing… → Saved.
 */
export function SaveIndicator({ saving }: { saving: boolean }) {
  const online = useOnline()
  const sync = useSyncState()

  let label: string
  let dot: string

  if (saving) {
    label = 'Saving…'
    dot = 'bg-ink-faint'
  } else if (!online) {
    label = 'Saved offline'
    dot = 'bg-amber-400'
  } else if (sync.phase === 'syncing' || sync.pending > 0) {
    label = 'Syncing…'
    dot = 'bg-sky-400'
  } else if (sync.phase === 'error') {
    // Soft language — we retry automatically, so this isn't a user failure.
    label = 'Saved · will sync'
    dot = 'bg-amber-400'
  } else {
    label = 'Saved'
    dot = 'bg-emerald-400'
  }

  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  )
}
