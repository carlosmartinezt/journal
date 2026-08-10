import { db } from './db'
import type { CachedUser } from '../../types'

/**
 * Typed access to the small `appMeta` key/value store: cached session user,
 * the pull cursor, and the last successful sync time.
 */

const KEYS = {
  cachedUser: 'cachedUser',
  pullCursor: 'pullCursor', // ISO timestamp of newest server row seen
  lastSyncedAt: 'lastSyncedAt',
} as const

async function get<T>(key: string): Promise<T | undefined> {
  const row = await db.appMeta.get(key)
  return row?.value as T | undefined
}

async function set(key: string, value: unknown): Promise<void> {
  await db.appMeta.put({ key, value })
}

export const meta = {
  async getCachedUser(): Promise<CachedUser | null> {
    return (await get<CachedUser>(KEYS.cachedUser)) ?? null
  },
  async setCachedUser(user: CachedUser | null): Promise<void> {
    await set(KEYS.cachedUser, user)
  },

  async getPullCursor(): Promise<string | null> {
    return (await get<string>(KEYS.pullCursor)) ?? null
  },
  async setPullCursor(cursor: string): Promise<void> {
    await set(KEYS.pullCursor, cursor)
  },

  async getLastSyncedAt(): Promise<number | null> {
    return (await get<number>(KEYS.lastSyncedAt)) ?? null
  },
  async setLastSyncedAt(ts: number): Promise<void> {
    await set(KEYS.lastSyncedAt, ts)
  },

  /** Clear per-user cursors on logout so a different account starts clean. */
  async clearSyncState(): Promise<void> {
    await db.appMeta.bulkDelete([KEYS.pullCursor, KEYS.lastSyncedAt])
  },
}
