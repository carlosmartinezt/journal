import { useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

/**
 * Native-style scroll behaviour for the whole app.
 *
 * - Remembers each history entry's scroll position and restores it on Back
 *   (POP), so returning to the timeline/calendar lands where you left off.
 * - New screens (PUSH/REPLACE) start at the top.
 * - The calendar opens at the bottom (most recent month) when there's nothing
 *   to restore.
 *
 * A single always-on scroll listener records against the *current* history key,
 * so a new screen's scroll-to-top can never be recorded against the previous
 * screen (the bug a per-component listener hit during unmount). Restoration
 * re-applies across a few frames so it still works once async content (and the
 * timeline's restored window size) finishes laying out.
 */
const positions = new Map<string, number>()

export function ScrollManager() {
  const location = useLocation()
  const navType = useNavigationType()
  const keyRef = useRef(location.key)

  // Keep the "current key" current so the save listener attributes scrolls to
  // the screen actually on-screen.
  keyRef.current = location.key

  useLayoutEffect(() => {
    const onScroll = () => positions.set(keyRef.current, window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useLayoutEffect(() => {
    const key = location.key
    const saved = positions.get(key)
    const restoring = navType === 'POP' && saved != null
    const wantsBottom = !restoring && location.pathname === '/calendar'

    let frames = 0
    let lastHeight = -1
    let stableFrames = 0
    let grew = false
    const apply = () => {
      const height = document.documentElement.scrollHeight
      const maxY = Math.max(0, height - window.innerHeight)
      const target = restoring ? saved! : wantsBottom ? maxY : 0
      window.scrollTo(0, target)
      frames += 1

      if (wantsBottom) {
        // Keep pinning to the bottom until async content has loaded (height
        // grew past the initial Loading… screen) AND then stopped changing, so
        // a cold load still lands on the most recent month.
        if (lastHeight >= 0 && height > lastHeight) grew = true
        stableFrames = height === lastHeight ? stableFrames + 1 : 0
        lastHeight = height
        if (!(grew && stableFrames >= 3) && frames < 90) requestAnimationFrame(apply)
      } else if (Math.abs(window.scrollY - target) > 2 && frames < 60) {
        // Restoring/top: re-apply until content is tall enough to reach it.
        requestAnimationFrame(apply)
      }
    }
    apply()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  return null
}
