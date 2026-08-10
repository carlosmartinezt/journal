import { useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import type { ImportProgress } from '../lib/dayone/importer'
import { downloadBlob } from '../lib/download'
import { toJournalDate } from '../lib/date'

type Status =
  | { kind: 'idle' }
  | { kind: 'busy'; label: string }
  | { kind: 'done'; label: string; warnings: string[] }
  | { kind: 'error'; label: string }

/**
 * Day One import/export (entries + photos). Import reads a Day One JSON .zip
 * into the local store (offline-first, then synced); export produces a Day One-
 * compatible .zip. Both operate against IndexedDB, so they work offline too
 * (an import syncs up when connectivity returns).
 */
export function DayOneSection() {
  const { user } = useAuth()
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const fileRef = useRef<HTMLInputElement>(null)

  const runImport = async (file: File) => {
    if (!user) return
    setStatus({ kind: 'busy', label: 'Reading archive…' })
    try {
      // Lazy-load the heavy Day One libs (JSZip/marked/md5) only when used.
      const { importDayOne } = await import('../lib/dayone/importer')
      const onProgress = (p: ImportProgress) =>
        setStatus({ kind: 'busy', label: `Importing ${p.current} of ${p.total}…` })
      const res = await importDayOne(file, user.id, onProgress)
      setStatus({
        kind: 'done',
        label: `Imported ${res.entries} ${plural(res.entries, 'entry', 'entries')} and ${res.photos} ${plural(res.photos, 'photo', 'photos')}. Syncing in the background.`,
        warnings: res.warnings,
      })
    } catch (err) {
      setStatus({ kind: 'error', label: err instanceof Error ? err.message : 'Import failed.' })
    }
  }

  const runExport = async () => {
    if (!user) return
    setStatus({ kind: 'busy', label: 'Preparing export…' })
    try {
      const { exportDayOne } = await import('../lib/dayone/exporter')
      const res = await exportDayOne(user.id)
      downloadBlob(res.blob, `journal-dayone-${toJournalDate()}.zip`)
      setStatus({
        kind: 'done',
        label: `Exported ${res.entries} ${plural(res.entries, 'entry', 'entries')} and ${res.photos} ${plural(res.photos, 'photo', 'photos')}.`,
        warnings: res.warnings,
      })
    } catch (err) {
      setStatus({ kind: 'error', label: err instanceof Error ? err.message : 'Export failed.' })
    }
  }

  const busy = status.kind === 'busy'

  return (
    <div>
      <p className="px-1 pb-3 text-sm leading-relaxed text-ink-soft">
        Move your journal between this app and Day One, including photos.
      </p>

      <input
        ref={fileRef}
        type="file"
        accept=".zip,.json,application/zip,application/json"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = '' // allow re-selecting the same file
          if (f) void runImport(f)
        }}
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={busy}
        className="mb-2 w-full rounded-xl border border-line py-3 text-center font-medium text-ink active:bg-line disabled:opacity-50"
      >
        Import from Day One (.zip or .json)
      </button>
      <button
        onClick={() => void runExport()}
        disabled={busy}
        className="w-full rounded-xl border border-line py-3 text-center font-medium text-ink active:bg-line disabled:opacity-50"
      >
        Export to Day One (.zip)
      </button>

      {status.kind !== 'idle' && (
        <div className="mt-3 rounded-xl bg-paper px-3 py-2.5 text-sm">
          <p className={status.kind === 'error' ? 'text-accent' : 'text-ink-soft'}>
            {busy && <span className="mr-1.5 inline-block animate-pulse">●</span>}
            {status.label}
          </p>
          {status.kind === 'done' && status.warnings.length > 0 && (
            <details className="mt-2 text-xs text-ink-faint">
              <summary className="cursor-pointer">
                {status.warnings.length} {plural(status.warnings.length, 'note', 'notes')}
              </summary>
              <ul className="mt-1 list-disc space-y-0.5 pl-4">
                {status.warnings.slice(0, 20).map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
                {status.warnings.length > 20 && <li>…and {status.warnings.length - 20} more</li>}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  )
}

function plural(n: number, one: string, many: string): string {
  return n === 1 ? one : many
}
