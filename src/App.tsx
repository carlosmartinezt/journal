import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppLayout } from './components/AppLayout'
import { LoginPage } from './pages/LoginPage'
import { TimelinePage } from './pages/TimelinePage'
import { SettingsPage } from './pages/SettingsPage'

// The editor pulls in TipTap/ProseMirror (the bulk of the bundle); load it on
// demand so the timeline + login paint fast. It's fetched the moment an entry
// is opened and then precached by the service worker for offline use.
const EntryEditorPage = lazy(() =>
  import('./pages/EntryEditorPage').then((m) => ({ default: m.EntryEditorPage })),
)

function EditorFallback() {
  return <div className="px-6 py-16 text-center font-serif text-ink-faint">Loading…</div>
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            {/* Full-screen editor (its own layout, no bottom nav). */}
            <Route
              path="/entry/:id"
              element={
                <Suspense fallback={<EditorFallback />}>
                  <EntryEditorPage />
                </Suspense>
              }
            />
            {/* Primary tabs share the app shell. */}
            <Route element={<AppLayout />}>
              <Route index element={<TimelinePage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
