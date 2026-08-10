import { useSyncExternalStore } from 'react'
import { getPlatform } from '../platform'

/** Reactive connectivity via the platform port (honours simulated-offline). */
export function useOnline(): boolean {
  const net = getPlatform().connectivity
  return useSyncExternalStore(
    (cb) => net.subscribe(() => cb()),
    () => net.isOnline(),
    () => true,
  )
}
