import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

/**
 * Gates the app behind authentication. While the session is resolving we show
 * a calm splash rather than flashing the login screen (important on a cold
 * offline launch, where the cached session resolves a beat later).
 */
export function ProtectedRoute() {
  const { status } = useAuth()

  if (status === 'loading') {
    return (
      <div className="flex min-h-full items-center justify-center">
        <div className="animate-pulse font-serif text-lg text-ink-faint">Journal</div>
      </div>
    )
  }
  if (status === 'anon') return <Navigate to="/login" replace />
  return <Outlet />
}
