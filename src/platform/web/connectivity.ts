import type { ConnectivityPort } from '../ports'

/**
 * Web connectivity adapter. Wraps navigator.onLine + online/offline events,
 * and adds a developer-only "simulated offline" override so the Dev Panel can
 * exercise offline behaviour without toggling Wi-Fi. The override lives here
 * (in the web adapter), not in the port, so it never leaks into domain logic.
 */
export class WebConnectivity implements ConnectivityPort {
  private listeners = new Set<(online: boolean) => void>()
  /** null = follow the real navigator; true/false = forced (dev only). */
  private forced: boolean | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.emit)
      window.addEventListener('offline', this.emit)
    }
  }

  isOnline(): boolean {
    if (this.forced !== null) return !this.forced
    return typeof navigator === 'undefined' ? true : navigator.onLine
  }

  subscribe(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private emit = () => {
    const state = this.isOnline()
    for (const l of this.listeners) l(state)
  }

  // --- dev-only controls (not part of ConnectivityPort) ---
  setSimulatedOffline(value: boolean | null) {
    this.forced = value
    this.emit()
  }

  getSimulatedOffline(): boolean | null {
    return this.forced
  }
}

/** Shared web connectivity instance (also used by the Dev Panel controls). */
export const webConnectivity = new WebConnectivity()
