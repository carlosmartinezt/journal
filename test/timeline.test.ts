import { describe, expect, it } from 'vitest'
import { groupByDate, buildYearIndex } from '../src/hooks/useTimeline'
import type { Entry } from '../src/types'

function entry(journalDate: string, createdAt: number): Entry {
  return {
    id: `${journalDate}-${createdAt}`,
    userId: 'u',
    title: '',
    content: { type: 'doc', content: [] },
    plainText: '',
    journalDate,
    createdAt,
    updatedAt: createdAt,
    serverUpdatedAt: null,
    deletedAt: null,
    syncStatus: 'synced',
  }
}

// Sorted as the timeline provides them: journalDate desc, createdAt desc.
const sorted: Entry[] = [
  entry('2026-08-08', 300),
  entry('2026-08-08', 200),
  entry('2025-03-14', 100),
  entry('2024-12-25', 50),
]

describe('groupByDate', () => {
  it('groups consecutive same-day entries, preserving order', () => {
    const groups = groupByDate(sorted)
    expect(groups.map((g) => g.journalDate)).toEqual(['2026-08-08', '2025-03-14', '2024-12-25'])
    expect(groups[0].entries).toHaveLength(2)
    expect(groups[0].entries[0].createdAt).toBe(300) // newest first within the day
  })
})

describe('buildYearIndex', () => {
  it('lists years and months present, both newest-first', () => {
    const index = buildYearIndex(sorted)
    expect(index.map((y) => y.year)).toEqual([2026, 2025, 2024])
    expect(index[0].months).toEqual([7]) // August = 7 (0-based)
    expect(index[2].months).toEqual([11]) // December = 11
  })
})
