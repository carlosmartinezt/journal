/** Date/time helpers. All "journal dates" are local-time YYYY-MM-DD strings. */

/** Local-time YYYY-MM-DD for a given epoch (default: now). */
export function toJournalDate(epoch: number = Date.now()): string {
  const d = new Date(epoch)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const DAY_HEADER = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
})

const DAY_HEADER_WITH_YEAR = new Intl.DateTimeFormat(undefined, {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

const TIME_FMT = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

const SHORT_DATE = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
})

/** "Aug 8, 2026" — the concrete date, shown alongside relative labels. */
export function formatShortDate(journalDate: string): string {
  return SHORT_DATE.format(parseJournalDate(journalDate))
}

/** Parse a YYYY-MM-DD journal date into a local Date at midnight. */
export function parseJournalDate(journalDate: string): Date {
  const [y, m, d] = journalDate.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/** "Today", "Yesterday", or a friendly date header for a journal date. */
export function formatDateHeader(journalDate: string): string {
  const date = parseJournalDate(journalDate)
  const today = new Date()
  const todayKey = toJournalDate(today.getTime())
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  const yesterdayKey = toJournalDate(yesterday.getTime())

  if (journalDate === todayKey) return 'Today'
  if (journalDate === yesterdayKey) return 'Yesterday'

  const sameYear = date.getFullYear() === today.getFullYear()
  return sameYear ? DAY_HEADER.format(date) : DAY_HEADER_WITH_YEAR.format(date)
}

/** "11:48 PM" style time from an epoch. */
export function formatTime(epoch: number): string {
  return TIME_FMT.format(new Date(epoch))
}
