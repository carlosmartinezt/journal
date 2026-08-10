import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { entriesRepo } from '../db/local/entriesRepo'
import { syncEngine } from '../sync/SyncEngine'
import { useAuth } from '../auth/AuthContext'

/**
 * Returns a handler that creates a fresh entry locally and opens its editor.
 * Creation is instantaneous and fully offline; a background sync is requested
 * (a no-op when offline, picked up automatically when connectivity returns).
 *
 * Pass a `journalDate` (YYYY-MM-DD) to backdate the entry — e.g. from the
 * new-entry sheet's date picker. Omit it to use today.
 */
export function useCreateEntry() {
  const navigate = useNavigate()
  const { user } = useAuth()

  return useCallback(
    async (journalDate?: string) => {
      if (!user) return
      const entry = await entriesRepo.create({ userId: user.id, journalDate })
      syncEngine.requestSync('create')
      navigate(`/entry/${entry.id}`)
    },
    [navigate, user],
  )
}
