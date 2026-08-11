import { useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

/**
 * `/demo` — a shareable link straight into the sample journal. Seeds the demo
 * and hands over to the timeline. Anyone already signed in just goes home;
 * their own journal is the better demo.
 */
export function DemoPage() {
  const { status, isDemo, startDemo } = useAuth()
  const started = useRef(false)

  useEffect(() => {
    if (status !== 'anon' || started.current) return
    started.current = true
    void startDemo()
  }, [status, startDemo])

  if (isDemo) return <Navigate to="/" replace />
  if (status === 'authed') return <Navigate to="/" replace />

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-8 text-center">
      <div className="animate-pulse font-serif text-2xl text-ink">Journal</div>
      <p className="mt-3 font-serif text-ink-faint">Setting up the demo…</p>
    </div>
  )
}
