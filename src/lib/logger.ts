import { env } from './env'

/**
 * A tiny logger that is silent in production for anything that could contain
 * journal content. Sync/plumbing diagnostics are allowed in dev only.
 * We deliberately never log entry titles/bodies.
 */
export const log = {
  debug(...args: unknown[]) {
    if (env.isDev) console.debug('[journal]', ...args)
  },
  info(...args: unknown[]) {
    if (env.isDev) console.info('[journal]', ...args)
  },
  /** Warnings/errors are metadata-only and safe to surface even in prod. */
  warn(...args: unknown[]) {
    console.warn('[journal]', ...args)
  },
  error(...args: unknown[]) {
    console.error('[journal]', ...args)
  },
}
