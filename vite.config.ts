/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Only inject the SW in prod builds by default; enable in dev to test offline.
      devOptions: {
        enabled: false,
        type: 'module',
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'robots.txt'],
      manifest: {
        name: 'Journal',
        short_name: 'Journal',
        description: 'A calm, offline-first personal journal.',
        theme_color: '#1c1917',
        background_color: '#faf8f5',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['lifestyle', 'productivity'],
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/icons/maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Precache the full app shell so a cold, offline launch renders the SPA
        // instead of the browser's offline error page.
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,ico}'],
        // Any navigation (deep link / refresh) offline falls back to the shell.
        navigateFallback: '/index.html',
        // Never route Supabase auth/rest/storage/realtime through the shell fallback.
        navigateFallbackDenylist: [/^\/api/, /supabase\.co/],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        // Supabase requests are deliberately NOT precached and default to
        // network-only so we never serve stale journal data or auth tokens.
        runtimeCaching: [
          {
            // Same-origin static assets already precached; this covers anything
            // added at runtime (e.g. lazily-loaded chunks).
            urlPattern: ({ sameOrigin, request }) =>
              sameOrigin && request.destination === 'script',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'app-scripts' },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'test/**/*.{test,spec}.{ts,tsx}'],
  },
})
