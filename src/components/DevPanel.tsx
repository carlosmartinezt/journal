import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/local/db'
import { webConnectivity } from '../platform/web/connectivity'
import { syncEngine } from '../sync/SyncEngine'
import { useSyncState } from '../hooks/useSyncState'
import { failNextPushes } from '../sync/devFaults'

/**
 * Developer-only panel to exercise offline behaviour without touching Wi-Fi.
 * Rendered only in dev builds (see AppLayout). It can:
 *  - simulate offline / online
 *  - inject a temporary "sync failure"
 *  - force a sync now
 *  - inspect pending queue + conflicts
 */
export function DevPanel() {
  const [open, setOpen] = useState(false)
  const [simOffline, setSimOffline] = useState(webConnectivity.getSimulatedOffline() === true)
  const sync = useSyncState()

  const queue = useLiveQuery(() => db.syncQueue.toArray(), [], [])
  const conflicts = useLiveQuery(() => db.conflicts.count(), [], 0)

  useEffect(() => {
    webConnectivity.setSimulatedOffline(simOffline ? true : null)
  }, [simOffline])

  return (
    <div className="fixed left-2 z-40" style={{ bottom: 'calc(var(--sab) + 84px)' }}>
      {open ? (
        <div className="w-64 rounded-xl border border-line bg-paper-raised p-3 text-xs shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-semibold text-ink">Dev tools</span>
            <button onClick={() => setOpen(false)} className="text-ink-faint">✕</button>
          </div>

          <div className="space-y-2">
            <Row label="Sync phase">
              <span className="font-mono">{sync.phase}</span>
            </Row>
            <Row label="Pending">
              <span className="font-mono">{sync.pending}</span>
            </Row>
            <Row label="Conflicts">
              <span className="font-mono">{conflicts}</span>
            </Row>

            <label className="flex items-center justify-between py-1">
              <span>Simulate offline</span>
              <input
                type="checkbox"
                checked={simOffline}
                onChange={(e) => setSimOffline(e.target.checked)}
              />
            </label>

            <button
              onClick={() => failNextPushes(3)}
              className="w-full rounded-lg bg-amber-100 py-1.5 font-medium text-amber-800"
            >
              Fail next 3 pushes
            </button>
            <button
              onClick={() => void syncEngine.syncNow()}
              className="w-full rounded-lg bg-ink py-1.5 font-medium text-paper"
            >
              Sync now
            </button>

            {queue.length > 0 && (
              <div className="mt-2 max-h-32 overflow-auto rounded-lg bg-paper p-2 font-mono text-[10px] leading-relaxed text-ink-soft">
                {queue.map((q) => (
                  <div key={q.id}>
                    {q.type} · {q.entityId.slice(0, 6)} · a{q.attempts}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="rounded-full border border-line bg-paper-raised px-3 py-1.5 text-xs font-medium text-ink-soft shadow-md"
        >
          🛠 dev{sync.pending > 0 ? ` · ${sync.pending}` : ''}
        </button>
      )}
    </div>
  )
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-ink-faint">{label}</span>
      {children}
    </div>
  )
}
