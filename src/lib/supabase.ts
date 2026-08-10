import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'
import { getPlatform } from '../platform'

/**
 * A single Supabase client for the app. When Supabase isn't configured (no env
 * vars yet), `supabase` is null and the app runs in local-only mode — the
 * offline-first store still works; only remote sync is disabled.
 *
 * Session persistence + auto-refresh keep the authenticated session in
 * localStorage so the app stays usable offline after the first online login.
 */
export const supabase: SupabaseClient | null = env.supabaseConfigured
  ? createClient(env.supabaseUrl, env.supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'journal.auth',
        // Route session persistence through the secure-storage port so a
        // native build can back it with the OS keychain unchanged.
        storage: getPlatform().secureStorage,
      },
    })
  : null

export const STORAGE_BUCKET = 'journal-photos'
