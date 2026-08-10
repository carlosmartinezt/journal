import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/local/db'
import type { Entry } from '../types'

/**
 * Reactive single-entry read. Returns `undefined` while loading and `null`
 * when the entry doesn't exist (or was deleted).
 */
export function useEntry(id: string | undefined): Entry | null | undefined {
  return useLiveQuery(
    async () => {
      if (!id) return null
      const e = await db.entries.get(id)
      if (!e || e.deletedAt) return null
      return e
    },
    [id],
    undefined,
  )
}
