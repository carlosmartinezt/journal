import { describe, expect, it } from 'vitest'
import { monthGrid, monthKey, toDateKey, dayOfMonth } from '../src/lib/date'

describe('monthGrid', () => {
  it('lays out all days of the month with correct weekday alignment', () => {
    const grid = monthGrid(2026, 7) // August 2026
    const days = grid.flat().filter((d): d is number => d !== null)
    expect(days).toEqual(Array.from({ length: 31 }, (_, i) => i + 1))
    expect(grid.every((week) => week.length === 7)).toBe(true)
    // The "1" sits in the column matching its real weekday.
    const flat = grid.flat()
    expect(flat.indexOf(1)).toBe(new Date(2026, 7, 1).getDay())
  })

  it('handles a February', () => {
    const days = monthGrid(2025, 1).flat().filter((d) => d !== null)
    expect(days.length).toBe(28)
  })
})

describe('date key helpers', () => {
  it('builds and reads YYYY-MM-DD keys', () => {
    expect(toDateKey(2026, 7, 8)).toBe('2026-08-08')
    expect(monthKey('2026-08-08')).toBe('2026-08')
    expect(dayOfMonth('2026-08-08')).toBe(8)
  })
})
