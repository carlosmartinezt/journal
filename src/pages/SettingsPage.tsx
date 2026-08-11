import { useAuth } from '../auth/AuthContext'
import { useOnline } from '../hooks/useOnline'
import { useSyncState } from '../hooks/useSyncState'
import { syncEngine } from '../sync/SyncEngine'
import { env } from '../lib/env'
import { formatTime } from '../lib/date'
import { DayOneSection } from '../components/DayOneSection'

/** Minimal settings: account, sync status, offline info, version, logout. */
export function SettingsPage() {
  const { user, isDemo, signOut } = useAuth()
  const online = useOnline()
  const sync = useSyncState()

  if (isDemo) return <DemoSettings onExit={() => void signOut()} />

  return (
    <div className="px-5">
      <header className="px-1 pb-4 pt-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Settings</h1>
      </header>

      <Section title="Account">
        <Row label="Email" value={user?.email ?? '—'} />
        <button
          onClick={() => void signOut()}
          className="mt-1 w-full rounded-xl border border-line py-3 text-center font-medium text-accent active:bg-line"
        >
          Log out
        </button>
      </Section>

      <Section title="Sync">
        <Row label="Connection" value={online ? 'Online' : 'Offline'} />
        <Row label="Status" value={statusLabel(sync.phase)} />
        <Row label="Pending changes" value={String(sync.pending)} />
        <Row
          label="Last synced"
          value={sync.lastSyncedAt ? formatTime(sync.lastSyncedAt) : 'Not yet'}
        />
        <button
          onClick={() => void syncEngine.syncNow()}
          disabled={!online}
          className="mt-1 w-full rounded-xl bg-ink py-3 text-center font-medium text-paper active:opacity-80 disabled:opacity-40"
        >
          Sync now
        </button>

        <details className="group mt-3">
          <summary className="flex cursor-pointer list-none items-center gap-1 px-1 text-xs font-medium text-ink-faint [&::-webkit-details-marker]:hidden">
            Advanced
            <svg
              className="transition-transform group-open:rotate-90"
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </summary>
          <div className="mt-2">
            <button
              onClick={() => void syncEngine.reloadFromServer()}
              disabled={!online}
              className="w-full rounded-xl border border-line py-3 text-center text-sm font-medium text-ink active:bg-line disabled:opacity-40"
            >
              Reload everything from server
            </button>
            <p className="px-1 pt-2 text-xs text-ink-faint">
              You shouldn’t normally need this — syncing is automatic. It forces a
              full re-download from the server; use it only if a device seems to be
              missing entries. Your local changes are kept.
            </p>
          </div>
        </details>
      </Section>

      <Section title="Day One">
        <DayOneSection />
      </Section>

      <Section title="Offline & installation">
        <p className="px-1 py-1 text-sm leading-relaxed text-ink-soft">
          This journal works fully offline. Your entries and photos are stored on
          your device first, then synced when you’re back online. Add it to your
          home screen (Share → “Add to Home Screen”) to launch it like a native
          app — even without a connection.
        </p>
      </Section>

      <Section title="About">
        <Row label="Version" value={env.appVersion} />
        <Row label="Backend" value={env.supabaseConfigured ? 'Connected' : 'Local only'} />
      </Section>

      <p className="px-1 pb-8 pt-2 text-center text-xs text-ink-faint">
        Your journal is private. Only you can read your entries.
      </p>
    </div>
  )
}

/**
 * Settings while in the demo. Sync and Day One import are deliberately absent:
 * there's no account to sync to, and inviting someone to import their real
 * journal into a sandbox that gets wiped on exit would be a trap.
 */
function DemoSettings({ onExit }: { onExit: () => void }) {
  return (
    <div className="px-5">
      <header className="px-1 pb-4 pt-6">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Settings</h1>
      </header>

      <Section title="Demo">
        <p className="px-1 py-1 text-sm leading-relaxed text-ink-soft">
          You’re browsing a sample journal belonging to nobody. It lives entirely in
          this browser — nothing is uploaded, and no account exists. Feel free to
          write, edit, and delete: it’s all erased when you leave the demo.
        </p>
        <button
          onClick={onExit}
          className="mt-3 w-full rounded-xl bg-ink py-3 text-center font-medium text-paper active:opacity-80"
        >
          Exit demo
        </button>
      </Section>

      <Section title="Things to try">
        <ul className="space-y-1.5 px-1 py-1 text-sm leading-relaxed text-ink-soft">
          <li>· Write an entry with ＋ — pick any date, past or present</li>
          <li>· Scroll the calendar; tap a quiet day to start writing there</li>
          <li>· Open “On this day” to see this date in earlier years</li>
          <li>· Search across every entry — instantly, with no network</li>
          <li>· Turn off your wifi. Everything keeps working.</li>
        </ul>
      </Section>

      <Section title="Offline & installation">
        <p className="px-1 py-1 text-sm leading-relaxed text-ink-soft">
          This journal works fully offline. Entries and photos are stored on your
          device first, then synced to your account when you’re back online. Add it
          to your home screen (Share → “Add to Home Screen”) to launch it like a
          native app.
        </p>
      </Section>

      <Section title="About">
        <Row label="Version" value={env.appVersion} />
        <Row label="Mode" value="Demo (local only)" />
      </Section>

      <p className="px-1 pb-8 pt-2 text-center text-xs text-ink-faint">
        With a real account, only you can read your entries.
      </p>
    </div>
  )
}

function statusLabel(phase: string): string {
  switch (phase) {
    case 'syncing':
      return 'Syncing…'
    case 'offline':
      return 'Offline'
    case 'error':
      return 'Will retry'
    default:
      return 'Up to date'
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-widest text-ink-faint">
        {title}
      </h2>
      <div className="rounded-2xl border border-line bg-paper-raised p-3">{children}</div>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-1 py-2">
      <span className="text-sm text-ink-soft">{label}</span>
      <span className="max-w-[60%] truncate text-sm font-medium text-ink">{value}</span>
    </div>
  )
}
