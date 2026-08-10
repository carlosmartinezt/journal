import { Link } from 'react-router-dom'
import { formatTime, formatShortDate, weekdayAbbr, dayOfMonth } from '../lib/date'
import { previewText } from '../lib/content'
import { useFirstPhoto } from '../hooks/useFirstPhoto'
import type { Entry } from '../types'

/**
 * A single entry row: a left date rail (weekday + day number, shown once per
 * day) and the content on the right — title, preview, time, and a photo
 * thumbnail. Reused by the timeline, day view, On This Day, and search.
 *
 * `showFullDate` hides the rail and shows the full date + time in the meta line
 * instead — used where results span years (search).
 */
export function EntryRow({
  entry,
  showDate = true,
  showFullDate = false,
}: {
  entry: Entry
  showDate?: boolean
  showFullDate?: boolean
}) {
  const { url, count } = useFirstPhoto(entry.id)
  const preview = previewText(entry.plainText)
  const hasTitle = entry.title.trim().length > 0

  return (
    <Link to={`/entry/${entry.id}`} className="flex gap-3 px-4 py-3 transition-colors active:bg-line/50">
      {/* Date rail (hidden for the full-date variant) */}
      {!showFullDate && (
        <div className="w-10 shrink-0 pt-0.5 text-center">
          {showDate && (
            <>
              <div className="text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                {weekdayAbbr(entry.journalDate)}
              </div>
              <div className="font-serif text-xl font-semibold leading-tight text-ink">
                {dayOfMonth(entry.journalDate)}
              </div>
            </>
          )}
        </div>
      )}

      {/* Content */}
      <div className="min-w-0 flex-1">
        {hasTitle && (
          <h3 className="truncate font-serif text-[17px] font-semibold text-ink">{entry.title}</h3>
        )}
        {preview ? (
          <p className="line-clamp-2 font-serif text-[15px] leading-snug text-ink-soft">{preview}</p>
        ) : (
          !hasTitle && <p className="font-serif text-[15px] italic text-ink-faint">Empty entry</p>
        )}
        <div className="mt-0.5 text-xs text-ink-faint">
          {showFullDate
            ? `${formatShortDate(entry.journalDate)} · ${formatTime(entry.createdAt)}`
            : formatTime(entry.createdAt)}
        </div>
      </div>

      {/* Thumbnail */}
      {url && (
        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-line">
          <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
          {count > 1 && (
            <span className="absolute bottom-0.5 right-0.5 rounded bg-ink/70 px-1 text-[9px] font-semibold text-paper">
              {count}
            </span>
          )}
        </div>
      )}
    </Link>
  )
}
