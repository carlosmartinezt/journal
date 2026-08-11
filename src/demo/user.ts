import type { CachedUser } from '../types'

/**
 * The demo's identity, kept in its own tiny module so the auth layer can
 * reference it without pulling in the sample journal (entries + illustrations),
 * which is loaded on demand only when someone actually opens the demo.
 */
export const DEMO_USER_ID = 'demo-user'

export const DEMO_USER: CachedUser = {
  id: DEMO_USER_ID,
  email: 'demo@journal.app',
}
