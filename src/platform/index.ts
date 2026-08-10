import type { Platform } from './ports'
import { webConnectivity } from './web/connectivity'
import { WebLifecycle } from './web/lifecycle'
import { WebMediaPicker } from './web/mediaPicker'
import { WebImageProcessor } from './web/imageProcessor'
import { WebSecureStorage } from './web/secureStorage'

/**
 * Platform registry. The rest of the app calls `getPlatform()` and depends
 * only on the port interfaces. A native bootstrap (or a test) calls
 * `setPlatform()` with a different adapter set — nothing above this line
 * changes.
 */

function createWebPlatform(): Platform {
  return {
    connectivity: webConnectivity,
    lifecycle: new WebLifecycle(),
    media: new WebMediaPicker(),
    imageProcessor: new WebImageProcessor(),
    secureStorage: new WebSecureStorage(),
  }
}

let current: Platform = createWebPlatform()

export function getPlatform(): Platform {
  return current
}

/** Replace the active platform (native bootstrap or tests). */
export function setPlatform(platform: Platform): void {
  current = platform
}

export type { Platform } from './ports'
