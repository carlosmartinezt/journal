import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * Native-style "back": pop the history stack to return to wherever the user
 * came from (timeline, calendar, search, day view…), rather than always jumping
 * to a fixed screen. Falls back to `fallback` when there's no in-app history to
 * pop — e.g. when the entry was opened via a deep link or a cold PWA launch.
 */
export function useBack(fallback = '/') {
  const navigate = useNavigate()
  return useCallback(() => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0
    if (idx > 0) navigate(-1)
    else navigate(fallback, { replace: true })
  }, [navigate, fallback])
}
