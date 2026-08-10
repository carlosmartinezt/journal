import { uuid } from '../id'

/** Map common Day One photo `type` values to MIME types. */
export function mimeForType(type: string | undefined): string {
  switch ((type ?? '').toLowerCase()) {
    case 'png':
      return 'image/png'
    case 'heic':
      return 'image/heic'
    case 'gif':
      return 'image/gif'
    case 'webp':
      return 'image/webp'
    case 'jpeg':
    case 'jpg':
    default:
      return 'image/jpeg'
  }
}

/** File extension for a MIME type (used when writing a Day One export). */
export function typeForMime(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png'
    case 'image/heic':
      return 'heic'
    case 'image/gif':
      return 'gif'
    case 'image/webp':
      return 'webp'
    default:
      return 'jpeg'
  }
}

/**
 * Convert a Day One identifier (typically 32 hex chars, no hyphens) into a
 * canonical UUID so it can serve as a stable primary key (Postgres `uuid`).
 * Reusing the source id makes re-imports idempotent. Non-hex ids fall back to
 * a fresh UUID.
 */
export function dayOneIdToUuid(id: string | undefined): string {
  if (!id) return uuid()
  const hex = id.replace(/-/g, '').toLowerCase()
  if (/^[0-9a-f]{32}$/.test(hex)) {
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  // Already a canonical UUID?
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id.toLowerCase())) {
    return id.toLowerCase()
  }
  return uuid()
}

/** Uppercase 32-hex Day One-style id from a canonical UUID (for export). */
export function uuidToDayOneId(id: string): string {
  return id.replace(/-/g, '').toUpperCase()
}

/**
 * Derive a local YYYY-MM-DD journal date from an ISO timestamp, honoring the
 * entry's original timezone when available so the day matches what the writer
 * saw. Falls back to the local timezone.
 */
export function journalDateFromIso(iso: string, timeZone?: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) {
    // Unparseable — fall back to today in local time.
    const now = new Date()
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  }
  try {
    if (timeZone) {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).formatToParts(d)
      const y = parts.find((p) => p.type === 'year')?.value
      const m = parts.find((p) => p.type === 'month')?.value
      const day = parts.find((p) => p.type === 'day')?.value
      if (y && m && day) return `${y}-${m}-${day}`
    }
  } catch {
    /* invalid timeZone → fall through to local */
  }
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/** Remove inline Day One photo/moment references from entry markdown. */
export function stripMomentRefs(text: string): string {
  return text
    // ![...](dayone-moment://...) and ![...](dayone-moment:/...)
    .replace(/!\[[^\]]*\]\(dayone-moment:\/*[^)]*\)/g, '')
    // bare dayone-moment tokens
    .replace(/dayone-moment:\/*[A-Za-z0-9-]*/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Extract a leading H1/H2 as the entry title, returning the remaining body. */
export function splitTitle(md: string): { title: string; body: string } {
  const lines = md.split('\n')
  let i = 0
  while (i < lines.length && lines[i].trim() === '') i++
  const first = lines[i]?.trim() ?? ''
  const m = first.match(/^#{1,2}\s+(.*)$/)
  if (m) {
    const title = m[1].trim()
    const body = lines.slice(i + 1).join('\n').trim()
    return { title, body }
  }
  return { title: '', body: md.trim() }
}
