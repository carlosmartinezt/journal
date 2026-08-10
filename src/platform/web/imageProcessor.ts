import type { ImageProcessorPort, ProcessedImage } from '../ports'

const MAX_DIMENSION = 2048 // longest edge; generous, not aggressive
const QUALITY = 0.85

/**
 * Web image processor adapter. Decodes -> optionally downscales -> re-encodes
 * via <canvas>. Always falls back to the original bytes on any error so a
 * processing failure never loses the user's photo.
 */
export class WebImageProcessor implements ImageProcessorPort {
  async process(file: File): Promise<ProcessedImage> {
    try {
      const bitmap = await this.loadBitmap(file)
      const { width, height } = fitWithin(bitmap.width, bitmap.height, MAX_DIMENSION)

      if (width === bitmap.width && height === bitmap.height && file.size < 1_500_000) {
        bitmap.close?.()
        return { blob: file, width, height, mimeType: file.type || 'image/jpeg' }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no 2d context')
      ctx.drawImage(bitmap, 0, 0, width, height)
      bitmap.close?.()

      const keepPng = file.type === 'image/png'
      const outType = keepPng ? 'image/png' : 'image/jpeg'
      const blob = await canvasToBlob(canvas, outType, keepPng ? undefined : QUALITY)

      if (blob.size >= file.size) {
        return { blob: file, width, height, mimeType: file.type || outType }
      }
      return { blob, width, height, mimeType: outType }
    } catch {
      const dims = await safeDimensions(file)
      return { blob: file, width: dims.width, height: dims.height, mimeType: file.type || 'image/jpeg' }
    }
  }

  private async loadBitmap(file: File): Promise<ImageBitmap> {
    if (typeof createImageBitmap === 'function') {
      return await createImageBitmap(file)
    }
    const url = URL.createObjectURL(file)
    try {
      const img = await loadImg(url)
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      canvas.getContext('2d')!.drawImage(img, 0, 0)
      return (await createImageBitmap(canvas)) as ImageBitmap
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

function fitWithin(w: number, h: number, max: number) {
  if (w <= max && h <= max) return { width: w, height: h }
  const ratio = w > h ? max / w : max / h
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) }
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))),
      type,
      quality,
    )
  })
}

async function safeDimensions(file: File): Promise<{ width: number; height: number }> {
  try {
    const bitmap = await createImageBitmap(file)
    const dims = { width: bitmap.width, height: bitmap.height }
    bitmap.close?.()
    return dims
  } catch {
    return { width: 0, height: 0 }
  }
}
