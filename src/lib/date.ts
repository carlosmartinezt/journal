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

const MONTH_YEAR = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })
const WEEKDAY_ABBR = new Intl.DateTimeFormat(undefined, { weekday: 'short' })
const MONTH_LONG = new Intl.DateTimeFormat(undefined, { month: 'long' })
const DAY_FULL = new Intl.DateTimeFormat(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})
const MONTH_DAY = new Intl.DateTimeFormat(undefined, { month: 'long', day: 'numeric' })

/** "August 2026" — month separator label. */
export function formatMonthYear(journalDate: string): string {
  return MONTH_YEAR.format(parseJournalDate(journalDate))
}

/** "2026-08" — stable month grouping key. */
export function monthKey(journalDate: string): string {
  return journalDate.slice(0, 7)
}

/** "SAT" — uppercase weekday abbreviation for the date rail. */
export function weekdayAbbr(journalDate: string): string {
  return WEEKDAY_ABBR.format(parseJournalDate(journalDate)).toUpperCase()
}

/** Day-of-month number (1–31). */
export function dayOfMonth(journalDate: string): number {
  return parseJournalDate(journalDate).getDate()
}

/** "Saturday, August 8, 2026" — day-view title. */
export function formatDayFull(journalDate: string): string {
  return DAY_FULL.format(parseJournalDate(journalDate))
}

/** "August" — month name only. */
export function formatMonthLong(monthIndex: number): string {
  return MONTH_LONG.format(new Date(2020, monthIndex, 1))
}

/** "August 8" — for the On This Day header (no year). */
export function formatMonthDay(journalDate: string): string {
  return MONTH_DAY.format(parseJournalDate(journalDate))
}

/** YYYY-MM-DD for a given year/month/day. */
export function toDateKey(year: number, monthIndex: number, day: number): string {
  const m = String(monthIndex + 1).padStart(2, '0')
  const d = String(day).padStart(2, '0')
  return `${year}-${m}-${d}`
}

/**
 * Weeks of a month as a grid, each week an array of 7 cells (null = padding
 * for days outside the month). Week starts on Sunday.
 */
export function monthGrid(year: number, monthIndex: number): (number | null)[][] {
  const firstDay = new Date(year, monthIndex, 1).getDay() // 0 = Sunday
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const weeks: (number | null)[][] = []
  let week: (number | null)[] = new Array(firstDay).fill(null)
  for (let day = 1; day <= daysInMonth; day++) {
    week.push(day)
    if (week.length === 7) {
      weeks.push(week)
      week = []
    }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null)
    weeks.push(week)
  }
  return weeks
}
