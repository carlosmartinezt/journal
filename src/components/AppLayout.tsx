import { Outlet } from 'react-router-dom'
import { BottomNav } from './BottomNav'
import { DevPanel } from './DevPanel'
import { NewEntryProvider } from './NewEntry'
import { env } from '../lib/env'

/**
 * Shell for the primary tabs (Timeline, Settings): a scrollable content area
 * with the bottom navigation docked below. The editor uses its own full-screen
 * layout and is not wrapped by this. The NewEntryProvider makes the date-aware
 * "new entry" sheet available to the nav and the empty state.
 */
export function AppLayout() {
  return (
    <NewEntryProvider>
      <div className="mx-auto flex min-h-full max-w-2xl flex-col">
        <main className="flex-1 pb-28" style={{ paddingTop: 'var(--sat)' }}>
          <Outlet />
        </main>
        <BottomNav />
        {env.isDev && <DevPanel />}
      </div>
    </NewEntryProvider>
  )
}
