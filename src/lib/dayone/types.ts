/**
 * Subset of the Day One JSON export format we read/write.
 * A Day One export is a .zip containing one or more `<Journal>.json` files and
 * a `photos/` folder whose files are named `<md5>.<type>`. Entries reference
 * their photos inline via `![](dayone-moment://<identifier>)` and in a `photos`
 * array.
 */

export interface DayOnePhoto {
  identifier: string
  md5: string
  /** File extension / kind, e.g. "jpeg", "png", "heic". */
  type: string
  orderInEntry?: number
  width?: number
  height?: number
}

export interface DayOneEntry {
  uuid: string
  creationDate: string
  modifiedDate?: string
  text?: string
  /** IANA timezone, used to derive the local journal date. */
  timeZone?: string
  starred?: boolean
  tags?: string[]
  photos?: DayOnePhoto[]
}

export interface DayOneJournal {
  metadata?: { version?: string }
  entries: DayOneEntry[]
}
