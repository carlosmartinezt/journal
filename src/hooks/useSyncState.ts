import { useSyncExternalStore } from 'react'
import { syncEngine } from '../sync/SyncEngine'
import type { SyncState } from '../types'

/** Subscribe to the sync engine's live state. */
export function useSyncState(): SyncState {
  return useSyncExternalStore(
    (cb) => syncEngine.subscribe(() => cb()),
    () => syncEngine.getState(),
    () => syncEngine.getState(),
  )
}
