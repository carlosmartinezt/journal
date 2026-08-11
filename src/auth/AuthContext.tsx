import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'
import { SupabaseGateway } from '../db/remote/supabaseGateway'
import { withDevFaults } from '../sync/devFaults'
import { env } from '../lib/env'
import { syncEngine } from '../sync/SyncEngine'
import { meta } from '../db/local/meta'
import { db } from '../db/local/db'
import { log } from '../lib/logger'
import { DEMO_USER } from '../demo/user'
import type { CachedUser } from '../types'

type AuthStatus = 'loading' | 'authed' | 'anon'

interface AuthResult {
  ok: boolean
  /** User-facing message (e.g. needs email confirmation, wrong password). */
  message?: string
  /** True when signup succeeded but the account needs email confirmation. */
  needsConfirmation?: boolean
}

interface AuthContextValue {
  status: AuthStatus
  user: CachedUser | null
  /** True while browsing the public sample journal (never syncs). */
  isDemo: boolean
  signUp: (email: string, password: string) => Promise<AuthResult>
  signIn: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
  /** Enter the local demo session, seeding sample data. */
  startDemo: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading')
  const [user, setUser] = useState<CachedUser | null>(null)
  const [isDemo, setIsDemo] = useState(false)
  const configuredFor = useRef<string | null>(null)
  // Mirrors isDemo for the auth-state listener, which closes over stale state.
  const demoRef = useRef(false)

  /** Enter/leave the demo without ever touching the sync engine. */
  const activateDemo = useMemo(
    () => () => {
      demoRef.current = true
      setIsDemo(true)
      setUser(DEMO_USER)
      setStatus('authed')
    },
    [],
  )

  /** Attach a signed-in user to the sync engine + cache them for offline. */
  const activateUser = useMemo(
    () =>
      async (u: CachedUser) => {
        setUser(u)
        setStatus('authed')
        await meta.setCachedUser(u)
        if (supabase && configuredFor.current !== u.id) {
          configuredFor.current = u.id
          const base = new SupabaseGateway(supabase)
          const gateway = env.isDev ? withDevFaults(base) : base
          syncEngine.configure(gateway, u.id)
          syncEngine.start()
          // Kick an immediate reconcile after (re)authentication.
          void syncEngine.syncNow()
        }
      },
    [],
  )

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      // A demo session wins over everything else: it's purely local, so we must
      // not hand the demo user to the sync engine on reload.
      if (await meta.getDemoMode()) {
        if (!cancelled) activateDemo()
        return
      }

      // No backend configured → run local-only using any cached identity.
      if (!supabase) {
        const cached = await meta.getCachedUser()
        if (!cancelled) {
          setUser(cached)
          setStatus(cached ? 'authed' : 'anon')
        }
        return
      }

      // getSession() reads the persisted session from localStorage and does
      // NOT require the network unless it needs a token refresh — so a cold
      // offline launch after a prior login still resolves to the user.
      const { data } = await supabase.auth.getSession()
      if (cancelled) return

      if (data.session?.user) {
        await activateUser({
          id: data.session.user.id,
          email: data.session.user.email ?? null,
        })
      } else {
        // Offline fallback: trust the cached user so the journal opens offline.
        const cached = await meta.getCachedUser()
        if (cached) await activateUser(cached)
        else setStatus('anon')
      }
    }

    void bootstrap()

    // React to token refreshes / sign-in / sign-out from the SDK.
    const sub = supabase?.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') return // handled explicitly in signOut
      if (demoRef.current) return // a stale session must not hijack the demo
      if (session?.user) {
        void activateUser({ id: session.user.id, email: session.user.email ?? null })
      }
    })

    return () => {
      cancelled = true
      sub?.data.subscription.unsubscribe()
    }
  }, [activateUser, activateDemo])

  const startDemo = useMemo(
    () => async () => {
      // Loaded on demand — the sample journal and its illustrations stay out
      // of the bundle for everyone who never opens the demo.
      const { enterDemo } = await import('../demo/session')
      await enterDemo()
      activateDemo()
    },
    [activateDemo],
  )

  const signUp = useMemo(
    () =>
      async (email: string, password: string): Promise<AuthResult> => {
        if (!supabase) return { ok: false, message: 'Backend not configured.' }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          // Send the confirmation link back to THIS app's origin (dev or prod)
          // rather than the project's default Site URL. On return, the client's
          // detectSessionInUrl picks up the tokens and logs the user straight in.
          options: { emailRedirectTo: `${window.location.origin}/` },
        })
        if (error) return { ok: false, message: error.message }
        if (data.session?.user) {
          await activateUser({ id: data.session.user.id, email: data.session.user.email ?? null })
          return { ok: true }
        }
        // No session → project requires email confirmation.
        return {
          ok: true,
          needsConfirmation: true,
          message: 'Check your email to confirm your account, then log in.',
        }
      },
    [activateUser],
  )

  const signIn = useMemo(
    () =>
      async (email: string, password: string): Promise<AuthResult> => {
        if (!supabase) return { ok: false, message: 'Backend not configured.' }
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) return { ok: false, message: error.message }
        if (data.session?.user) {
          await activateUser({ id: data.session.user.id, email: data.session.user.email ?? null })
          return { ok: true }
        }
        return { ok: false, message: 'Could not sign in.' }
      },
    [activateUser],
  )

  const signOut = useMemo(
    () =>
      async () => {
        // Leaving the demo: purge the sample journal and anything the visitor
        // wrote in it, including queued ops, so nothing can leak into a real
        // account they sign into afterwards.
        if (demoRef.current) {
          const { exitDemo } = await import('../demo/session')
          await exitDemo()
          demoRef.current = false
          setIsDemo(false)
          setUser(null)
          setStatus('anon')
          return
        }

        syncEngine.stop()
        syncEngine.clearSession()
        configuredFor.current = null
        try {
          await supabase?.auth.signOut()
        } catch (e) {
          log.warn('signOut', e)
        }
        // Clear cached identity + sync cursors, then wipe local journal data so
        // the next account starts clean and nothing leaks between users.
        await meta.setCachedUser(null)
        await meta.clearSyncState()
        await db.transaction('rw', db.entries, db.photos, db.syncQueue, db.conflicts, async () => {
          await db.entries.clear()
          await db.photos.clear()
          await db.syncQueue.clear()
          await db.conflicts.clear()
        })
        setUser(null)
        setStatus('anon')
      },
    [],
  )

  const value: AuthContextValue = { status, user, isDemo, signUp, signIn, signOut, startDemo }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
