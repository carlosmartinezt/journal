import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { useOnline } from '../hooks/useOnline'

type Mode = 'signin' | 'signup'

/**
 * Authentication screen. Account creation / first login require connectivity;
 * afterwards the cached session keeps the app usable offline.
 */
export function LoginPage() {
  const { status, signIn, signUp, startDemo } = useAuth()
  const online = useOnline()
  const [mode, setMode] = useState<Mode>('signin')
  const [demoBusy, setDemoBusy] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  if (status === 'authed') return <Navigate to="/" replace />

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setMessage(null)
    setNotice(null)
    const fn = mode === 'signin' ? signIn : signUp
    const res = await fn(email.trim(), password)
    setBusy(false)
    if (!res.ok) {
      setMessage(res.message ?? 'Something went wrong.')
      return
    }
    if (res.needsConfirmation) {
      setNotice(res.message ?? 'Check your email to confirm, then log in.')
      setMode('signin')
    }
  }

  return (
    <div className="mx-auto flex min-h-full max-w-sm flex-col justify-center px-8 py-12">
      <div className="mb-10 text-center">
        <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">Journal</h1>
        <p className="mt-2 font-serif text-ink-soft">A quiet place for your thoughts.</p>
      </div>

      {!online && (
        <p className="mb-4 rounded-xl bg-accent-soft px-4 py-3 text-center text-sm text-ink-soft">
          You’re offline. Connect to the internet to {mode === 'signup' ? 'create an account' : 'sign in'} the first time.
        </p>
      )}

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoComplete="email"
          required
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-line bg-paper-raised px-4 py-3 text-ink outline-none transition-colors focus:border-accent"
        />
        <input
          type="password"
          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
          required
          minLength={6}
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-line bg-paper-raised px-4 py-3 text-ink outline-none transition-colors focus:border-accent"
        />

        {message && <p className="text-sm text-accent">{message}</p>}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-ink py-3 font-medium text-paper transition-opacity active:opacity-80 disabled:opacity-50"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        type="button"
        onClick={() => {
          setMode(mode === 'signin' ? 'signup' : 'signin')
          setMessage(null)
          setNotice(null)
        }}
        className="mt-6 text-center text-sm text-ink-soft"
      >
        {mode === 'signin' ? (
          <>New here? <span className="font-medium text-accent">Create an account</span></>
        ) : (
          <>Already have an account? <span className="font-medium text-accent">Sign in</span></>
        )}
      </button>

      {/* Try it without an account. The demo is entirely local — sample data
          seeded on this device, never synced, wiped when the visitor leaves. */}
      <div className="mt-10 border-t border-line pt-6 text-center">
        <button
          type="button"
          onClick={async () => {
            setDemoBusy(true)
            await startDemo()
          }}
          disabled={demoBusy}
          className="font-medium text-accent disabled:opacity-50"
        >
          {demoBusy ? 'Setting up the demo…' : 'See a demo →'}
        </button>
        <p className="mt-2 text-xs leading-relaxed text-ink-faint">
          Browse a sample journal — no account needed. Nothing leaves your device.
        </p>
      </div>
    </div>
  )
}
