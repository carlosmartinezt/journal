import type { RemoteGateway } from './gateway'

/**
 * Dev-only fault injection for the sync engine. Lets the Dev Panel simulate
 * push failures so retry/queue behaviour can be tested without a flaky network.
 * This lives outside the production SupabaseGateway; it's applied as a wrapper
 * only in dev builds (see AuthContext), so it never ships to production paths.
 */

let failCount = 0

/** Arm the next `n` push operations to fail. */
export function failNextPushes(n: number) {
  failCount = n
}

function maybeFail() {
  if (failCount > 0) {
    failCount -= 1
    throw new Error('Simulated sync failure (dev)')
  }
}

/** Wrap a gateway so mutating calls can be forced to fail on demand. */
export function withDevFaults(gateway: RemoteGateway): RemoteGateway {
  return {
    upsertEntry: (e) => (maybeFail(), gateway.upsertEntry(e)),
    deleteEntry: (e) => (maybeFail(), gateway.deleteEntry(e)),
    uploadPhoto: (p) => (maybeFail(), gateway.uploadPhoto(p)),
    deletePhoto: (p) => (maybeFail(), gateway.deletePhoto(p)),
    // Reads are never faulted — only pushes.
    pullEntries: (u, s) => gateway.pullEntries(u, s),
    pullPhotos: (u, s) => gateway.pullPhotos(u, s),
    downloadPhoto: (path) => gateway.downloadPhoto(path),
  }
}
