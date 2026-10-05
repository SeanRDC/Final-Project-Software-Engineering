import { expect, test } from 'vitest'

import { monthGrid, monthLabel, monthOf, shiftMonth } from '@/pages/dashboard/calendarGrid'

test('October 2026 starts on a Thursday and fills five weeks', () => {
  const weeks = monthGrid({ year: 2026, month: 10 })

  expect(weeks).toHaveLength(5)
  expect(weeks[0]!.map((cell) => cell.dayOfMonth)).toEqual([27, 28, 29, 30, 1, 2, 3])
  expect(weeks[0]!.map((cell) => cell.inMonth)).toEqual([
    false,
    false,
    false,
    false,
    true,
    true,
    true,
  ])
  expect(weeks[1]![0]).toEqual({ day: '2026-10-04', dayOfMonth: 4, inMonth: true, isSunday: true })
  expect(weeks[4]![6]!.day).toBe('2026-10-31')
})

test('a month that starts late in the week needs six rows', () => {
  expect(monthGrid({ year: 2026, month: 8 })).toHaveLength(6)
})

test('February of a common year that starts on Sunday fits four rows', () => {
  expect(monthGrid({ year: 2026, month: 2 })).toHaveLength(4)
})

test('moves across the year boundary', () => {
  expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 })
  expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 })
})

test('reads and names a month', () => {
  expect(monthOf('2026-10-04')).toEqual({ year: 2026, month: 10 })
  expect(monthLabel({ year: 2026, month: 10 })).toBe('October 2026')
})
