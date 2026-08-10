import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerSW } from 'virtual:pwa-register'

// Register the service worker with auto-update. Kept out of React so the app
// shell can be cached and launched offline. registerType:'autoUpdate' means new
// versions activate on next load without prompting — journal data (IndexedDB)
// is never touched by SW updates.
registerSW({ immediate: true })

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
