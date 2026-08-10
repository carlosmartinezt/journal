/**
 * Public runtime configuration. Only the anon Supabase key is exposed to the
 * client — never the service role key. `configured` lets the app run in a
 * fully-local mode (no remote sync) when Supabase env vars are absent, which
 * is exactly the offline-first behaviour we want during setup/dev.
 */
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const env = {
  supabaseUrl: url ?? '',
  supabaseAnonKey: anonKey ?? '',
  /** True only when both values are present and look real. */
  supabaseConfigured: Boolean(url && anonKey && url.startsWith('http')),
  appVersion: (import.meta.env.VITE_APP_VERSION as string | undefined) ?? '0.1.0',
  isDev: import.meta.env.DEV,
}
