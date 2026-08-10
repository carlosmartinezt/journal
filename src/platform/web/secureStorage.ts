import type { SecureStoragePort } from '../ports'

/**
 * Web secure-storage adapter. Backed by localStorage (which is where the
 * Supabase SDK persists the session anyway). A native adapter would swap in
 * the OS keychain / secure storage without any change to the auth code, since
 * both satisfy SecureStoragePort. Degrades to an in-memory map if storage is
 * unavailable (e.g. privacy mode) so the app still functions for the session.
 */
export class WebSecureStorage implements SecureStoragePort {
  private mem = new Map<string, string>()

  private get store(): Storage | null {
    try {
      return typeof localStorage !== 'undefined' ? localStorage : null
    } catch {
      return null
    }
  }

  getItem(key: string): string | null {
    const s = this.store
    if (s) {
      try {
        return s.getItem(key)
      } catch {
        /* fall through to memory */
      }
    }
    return this.mem.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    const s = this.store
    if (s) {
      try {
        s.setItem(key, value)
        return
      } catch {
        /* fall through */
      }
    }
    this.mem.set(key, value)
  }

  removeItem(key: string): void {
    const s = this.store
    if (s) {
      try {
        s.removeItem(key)
        return
      } catch {
        /* fall through */
      }
    }
    this.mem.delete(key)
  }
}
