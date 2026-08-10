/**
 * Platform capability ports (hexagonal architecture).
 *
 * Everything that differs between the PWA and a future native (Capacitor)
 * build lives behind these interfaces. UI, domain logic, and the sync engine
 * depend ONLY on these ports — never on `window`, `navigator`, `document`,
 * `localStorage`, or DOM file inputs directly. Swapping `platform/web/*` for
 * `platform/native/*` therefore requires no changes above this boundary.
 */

/** Network connectivity detection. */
export interface ConnectivityPort {
  isOnline(): boolean
  /** Subscribe to connectivity changes; returns an unsubscribe fn. */
  subscribe(listener: (online: boolean) => void): () => void
}

/** App lifecycle: foreground/background + last-chance flush before hide. */
export interface LifecyclePort {
  isForeground(): boolean
  /** App returned to the foreground. */
  onForeground(listener: () => void): () => void
  /** App is about to be hidden/backgrounded/terminated — flush now. */
  onBeforeHide(listener: () => void): () => void
}

/** Choosing a photo from the library or capturing one with the camera. */
export interface MediaPickerPort {
  /** Pick one or more images from the device library. */
  pickImages(options?: { multiple?: boolean }): Promise<File[]>
  /** Capture a single photo with the camera (null if cancelled). */
  captureImage(): Promise<File | null>
  /** Whether a camera capture affordance should be offered. */
  supportsCamera(): boolean
}

export interface ProcessedImage {
  blob: Blob
  width: number
  height: number
  mimeType: string
}

/** Client-side image resize/compression. */
export interface ImageProcessorPort {
  process(file: File): Promise<ProcessedImage>
}

/**
 * Secure key/value storage for sensitive tokens (the auth session). On web
 * this is localStorage; on native it can be the platform keychain/secure store.
 * The async-capable signature matches what Supabase's auth storage adapter and
 * native secure-storage plugins expect.
 */
export interface SecureStoragePort {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}

/** The aggregate platform surface consumed by the rest of the app. */
export interface Platform {
  connectivity: ConnectivityPort
  lifecycle: LifecyclePort
  media: MediaPickerPort
  imageProcessor: ImageProcessorPort
  secureStorage: SecureStoragePort
}
