import { NavLink } from 'react-router-dom'
import { useNewEntry } from './NewEntry'

/**
 * Minimal bottom navigation: Journal · New Entry · Settings. The center action
 * opens the date-aware new-entry sheet (always one tap). Respects the iOS safe
 * area so it clears the home indicator.
 */
export function BottomNav() {
  const { open } = useNewEntry()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-paper/90 backdrop-blur-md"
      style={{ paddingBottom: 'var(--sab)' }}
    >
      <div className="mx-auto flex max-w-2xl items-center justify-around px-6 py-2">
        <NavLink to="/" end className={tabClass} aria-label="Journal">
          {({ isActive }) => (
            <div className="flex flex-col items-center gap-0.5">
              <BookIcon active={isActive} />
              <span className="text-[10px] font-medium">Journal</span>
            </div>
          )}
        </NavLink>

        <button
          type="button"
          onClick={open}
          aria-label="New entry"
          className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-paper shadow-lg shadow-ink/20 transition-transform active:scale-95"
        >
          <PlusIcon />
        </button>

        <NavLink to="/settings" className={tabClass} aria-label="Settings">
          {({ isActive }) => (
            <div className="flex flex-col items-center gap-0.5">
              <GearIcon active={isActive} />
              <span className="text-[10px] font-medium">Settings</span>
            </div>
          )}
        </NavLink>
      </div>
    </nav>
  )
}

function tabClass() {
  return 'flex w-16 items-center justify-center py-1 text-ink-soft [&.active]:text-ink'
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z" />
      <path d="M4 19a2 2 0 0 0 2 2h13" />
    </svg>
  )
}
function GearIcon({ active }: { active: boolean }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.2 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2 2 2 0 1 1-4 0 1.7 1.7 0 0 0-2.9-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
    </svg>
  )
}
function PlusIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}
