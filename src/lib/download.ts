/**
 * Trigger a browser download of a Blob. This is a web-only UI concern (a native
 * build would share to the Files app instead), so it lives at the UI edge
 * rather than in the domain/sync layers.
 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Revoke on the next tick so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
