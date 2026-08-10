import type { LifecyclePort } from '../ports'

/**
 * Web app-lifecycle adapter. Maps the port to visibilitychange + pagehide.
 * `onBeforeHide` fires on both `visibilitychange`→hidden and `pagehide`, which
 * is the reliable moment on mobile to flush unsaved work before the OS may
 * discard the page.
 */
export class WebLifecycle implements LifecyclePort {
  isForeground(): boolean {
    if (typeof document === 'undefined') return true
    return document.visibilityState === 'visible'
  }

  onForeground(listener: () => void): () => void {
    if (typeof document === 'undefined') return () => {}
    const handler = () => {
      if (document.visibilityState === 'visible') listener()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }

  onBeforeHide(listener: () => void): () => void {
    if (typeof document === 'undefined') return () => {}
    const visHandler = () => {
      if (document.visibilityState === 'hidden') listener()
    }
    const hideHandler = () => listener()
    document.addEventListener('visibilitychange', visHandler)
    window.addEventListener('pagehide', hideHandler)
    return () => {
      document.removeEventListener('visibilitychange', visHandler)
      window.removeEventListener('pagehide', hideHandler)
    }
  }
}
