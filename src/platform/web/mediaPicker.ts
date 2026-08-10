import type { MediaPickerPort } from '../ports'

/**
 * Web media picker adapter. Uses a transient <input type="file"> to select
 * from the library or (with `capture`) open the camera on mobile. A native
 * adapter would instead call the Capacitor Camera plugin — the UI is unaware
 * of the difference.
 */
export class WebMediaPicker implements MediaPickerPort {
  pickImages(options?: { multiple?: boolean }): Promise<File[]> {
    return this.openInput({ multiple: options?.multiple ?? true })
  }

  async captureImage(): Promise<File | null> {
    const files = await this.openInput({ multiple: false, capture: 'environment' })
    return files[0] ?? null
  }

  supportsCamera(): boolean {
    if (typeof navigator === 'undefined') return false
    // Heuristic: touch-capable devices expose a usable camera capture flow.
    return (
      'ontouchstart' in window ||
      (navigator.maxTouchPoints ?? 0) > 0 ||
      Boolean(navigator.mediaDevices?.getUserMedia)
    )
  }

  private openInput(opts: { multiple: boolean; capture?: string }): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.multiple = opts.multiple
      if (opts.capture) input.setAttribute('capture', opts.capture)
      input.style.position = 'fixed'
      input.style.left = '-10000px'

      let settled = false
      const finish = (files: File[]) => {
        if (settled) return
        settled = true
        input.remove()
        resolve(files)
      }

      input.addEventListener('change', () => {
        finish(input.files ? Array.from(input.files) : [])
      })
      // If the user cancels, most browsers fire focus back on window; resolve
      // empty after a tick so callers aren't left hanging.
      window.addEventListener(
        'focus',
        () => setTimeout(() => finish([]), 500),
        { once: true },
      )

      document.body.appendChild(input)
      input.click()
    })
  }
}
