import { expect, test } from 'vitest'

import { termPresets } from '@/pages/reports/terms'

function periods(today: string) {
  return Object.fromEntries(termPresets(today).map(({ label, period }) => [label, period]))
}

test('gives the terms that have started, ending a running term today', () => {
  expect(periods('2026-10-04')).toEqual({
    'First semester': { start: '2026-08-01', end: '2026-10-04' },
    'Second semester': { start: '2026-01-01', end: '2026-05-31' },
    'Summer term': { start: '2026-06-01', end: '2026-07-31' },
  })
})

test('goes back a year for a term that has not started yet', () => {
  expect(periods('2027-03-10')).toEqual({
    'First semester': { start: '2026-08-01', end: '2026-12-31' },
    'Second semester': { start: '2027-01-01', end: '2027-03-10' },
    'Summer term': { start: '2026-06-01', end: '2026-07-31' },
  })
})
