import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useEntry } from '../hooks/useEntry'
import { useAuth } from '../auth/AuthContext'
import { entriesRepo } from '../db/local/entriesRepo'
import { photosRepo } from '../db/local/photosRepo'
import { syncEngine } from '../sync/SyncEngine'
import { getPlatform } from '../platform'
import { formatDateHeader, formatShortDate } from '../lib/date'
import { useJournalEditor, EditorContent, Toolbar } from '../editor/Editor'
import { PhotoGrid } from '../components/PhotoGrid'
import { SaveIndicator } from '../components/SaveIndicator'
import type { Entry, TipTapDoc } from '../types'

/** Loader: resolves the entry, then hands a stable snapshot to the editor. */
export function EntryEditorPage() {
  const { id } = useParams<{ id: string }>()
  const entry = useEntry(id)
  const navigate = useNavigate()

  if (entry === undefined) {
    return <div className="px-6 py-16 text-center font-serif text-ink-faint">Loading…</div>
  }
  if (entry === null) {
    // Deleted or missing — return to the timeline.
    return <MissingEntry onBack={() => navigate('/')} />
  }
  // Remount when the entry id changes so the editor re-initialises cleanly.
  return <EntryEditorInner key={entry.id} entry={entry} />
}

const SAVE_DEBOUNCE_MS = 400

function EntryEditorInner({ entry }: { entry: Entry }) {
  const navigate = useNavigate()
  const { user } = useAuth()
  const media = getPlatform().media

  const [saving, setSaving] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [addingPhoto, setAddingPhoto] = useState(false)

  // Latest values held in refs so the debounced flush always sees fresh data.
  const titleRef = useRef(entry.title)
  const contentRef = useRef<TipTapDoc>(entry.content)
  const dirtyRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const flush = useCallback(async () => {
    if (!dirtyRef.current) return
    dirtyRef.current = false
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    await entriesRepo.update(entry.id, {
      title: titleRef.current,
      content: contentRef.current,
    })
    setSaving(false)
    syncEngine.requestSync('edit')
  }, [entry.id])

  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    setSaving(true)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => void flush(), SAVE_DEBOUNCE_MS)
  }, [flush])

  const editor = useJournalEditor({
    initialContent: entry.content,
    onChange: (doc) => {
      contentRef.current = doc
      scheduleSave()
    },
  })

  // Flush on background/hide and on unmount so closing right after typing
  // never loses content.
  useEffect(() => {
    const unbind = getPlatform().lifecycle.onBeforeHide(() => void flush())
    return () => {
      unbind()
      void flush()
    }
  }, [flush])

  const onTitleChange = (value: string) => {
    titleRef.current = value
    scheduleSave()
  }

  const changeDate = async (value: string) => {
    if (!value) return
    await entriesRepo.update(entry.id, { journalDate: value })
    syncEngine.requestSync('edit')
  }

  const addPhotos = async (files: File[]) => {
    if (!user || files.length === 0) return
    setAddingPhoto(true)
    try {
      for (const file of files) {
        await photosRepo.addFromFile(entry.id, user.id, file)
      }
      syncEngine.requestSync('photo')
    } finally {
      setAddingPhoto(false)
    }
  }

  const remove = async () => {
    await entriesRepo.softDelete(entry.id)
    syncEngine.requestSync('delete')
    navigate('/')
  }

  return (
    <div className="mx-auto flex min-h-full max-w-2xl flex-col">
      {/* Top bar */}
      <header
        className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-3 py-2 backdrop-blur-md"
        style={{ paddingTop: 'calc(var(--sat) + 0.5rem)' }}
      >
        <button
          onClick={() => navigate('/')}
          aria-label="Back to journal"
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-ink-soft active:bg-line"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span className="text-sm">Journal</span>
        </button>

        <SaveIndicator saving={saving} />

        <div className="relative">
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Entry options"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-soft active:bg-line"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="12" cy="19" r="1.6" />
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 z-20 mt-1 w-40 overflow-hidden rounded-xl border border-line bg-paper-raised shadow-lg">
                <button
                  onClick={remove}
                  className="block w-full px-4 py-2.5 text-left text-sm text-accent active:bg-line"
                >
                  Delete entry
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Writing surface */}
      <div className="flex-1 px-5 pb-40 pt-4">
        <DateChip journalDate={entry.journalDate} onChange={changeDate} />

        <input
          type="text"
          defaultValue={entry.title}
          onChange={(e) => onTitleChange(e.target.value)}
          placeholder="Title"
          className="mb-2 w-full bg-transparent font-serif text-2xl font-semibold text-ink outline-none placeholder:text-ink-faint"
        />

        {editor && <EditorContent editor={editor} />}

        <PhotoGrid entryId={entry.id} />
      </div>

      {/* Bottom action bar: photos + formatting toolbar, above the keyboard. */}
      <div
        className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper-raised/95 backdrop-blur-md"
        style={{ paddingBottom: 'var(--sab)' }}
      >
        <div className="mx-auto max-w-2xl">
          <div className="flex items-center gap-1 border-b border-line px-2 py-1.5">
            <button
              onClick={async () => addPhotos(await media.pickImages())}
              disabled={addingPhoto}
              aria-label="Add photo from library"
              className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-ink-soft active:bg-line disabled:opacity-40"
            >
              <ImageIcon />
              <span className="text-[13px]">Photo</span>
            </button>
            {media.supportsCamera() && (
              <button
                onClick={async () => {
                  const f = await media.captureImage()
                  if (f) await addPhotos([f])
                }}
                disabled={addingPhoto}
                aria-label="Take a photo"
                className="flex h-9 items-center gap-1.5 rounded-lg px-2.5 text-ink-soft active:bg-line disabled:opacity-40"
              >
                <CameraIcon />
                <span className="text-[13px]">Camera</span>
              </button>
            )}
            {addingPhoto && <span className="ml-1 text-xs text-ink-faint">Adding…</span>}
          </div>
          {editor && <Toolbar editor={editor} />}
        </div>
      </div>
    </div>
  )
}

function MissingEntry({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 text-center">
      <p className="font-serif text-lg text-ink-soft">This entry isn’t here anymore.</p>
      <button onClick={onBack} className="mt-4 rounded-full bg-ink px-5 py-2.5 text-paper">
        Back to journal
      </button>
    </div>
  )
}

/**
 * A tappable date pill for the entry. Shows a friendly label (Today / Yesterday
 * / a date) plus the concrete date, and overlays a transparent native
 * <input type="date"> so a single tap opens the platform date picker reliably
 * on iOS, Android, and desktop — no showPicker() gymnastics.
 */
function DateChip({
  journalDate,
  onChange,
}: {
  journalDate: string
  onChange: (value: string) => void | Promise<void>
}) {
  const header = formatDateHeader(journalDate)
  const isRelative = header === 'Today' || header === 'Yesterday'

  return (
    <div className="relative mb-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper-raised px-3 py-1.5">
      <CalendarIcon />
      <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {header}
      </span>
      {isRelative && (
        <span className="text-xs text-ink-faint">· {formatShortDate(journalDate)}</span>
      )}
      <ChevronDownIcon />
      <input
        type="date"
        value={journalDate}
        onChange={(e) => e.target.value && void onChange(e.target.value)}
        aria-label="Change entry date"
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-ink-faint">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function ChevronDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-ink-faint">
      <path d="M6 9l6 6 6-6" />
    </svg>
  )
}

function ImageIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  )
}
function CameraIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  )
}
