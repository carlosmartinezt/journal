import { Link } from 'react-router-dom'
import { formatTime } from '../lib/date'
import { previewText } from '../lib/content'
import { useFirstPhoto } from '../hooks/useFirstPhoto'
import type { Entry } from '../types'

/**
 * A single timeline card: time, optional title, a short body preview, and a
 * photo thumbnail if present. Tapping it opens the entry.
 */
export function EntryCard({ entry }: { entry: Entry }) {
  const { url, count } = useFirstPhoto(entry.id)
  const preview = previewText(entry.plainText)
  const hasText = entry.title.trim().length > 0 || preview.length > 0

  return (
    <Link
      to={`/entry/${entry.id}`}
      className="flex gap-3 rounded-2xl px-4 py-3 transition-colors active:bg-line/60"
    >
      <div className="min-w-0 flex-1">
        <div className="mb-0.5 text-xs font-medium uppercase tracking-wide text-ink-faint">
          {formatTime(entry.createdAt)}
        </div>
        {entry.title.trim() && (
          <h3 className="truncate font-serif text-lg font-semibold text-ink">
            {entry.title}
          </h3>
        )}
        {preview ? (
          <p className="mt-0.5 line-clamp-2 font-serif text-[15px] leading-snug text-ink-soft">
            {preview}
          </p>
        ) : (
          !hasText && <p className="mt-0.5 font-serif text-[15px] italic text-ink-faint">Empty entry</p>
        )}
      </div>

      {url && (
        <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-line">
          <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
          {count > 1 && (
            <span className="absolute bottom-1 right-1 rounded-md bg-ink/70 px-1.5 text-[10px] font-semibold text-paper">
              {count}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
