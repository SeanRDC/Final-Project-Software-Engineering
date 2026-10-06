// The academic terms the clinic reports on (FR-13), as report periods.

import { parseDay, toDayString } from '@/lib/format'
import type { Period } from '@/pages/reports/useReports'

// Month numbers are 1-based. The academic year starts with the first semester in August;
// change the months here if the university moves its calendar.
const TERMS = [
  { label: 'First semester', startMonth: 8, endMonth: 12 },
  { label: 'Second semester', startMonth: 1, endMonth: 5 },
  { label: 'Summer term', startMonth: 6, endMonth: 7 },
] as const

/**
 * The latest occurrence of each term that has started by `today`, e.g. on 4 October 2026
 * the first semester of 2026 (so far), and the second semester and summer term of 2026.
 * A term still running ends today, like the other presets.
 */
export function termPresets(today: string): { label: string; period: Period }[] {
  const now = parseDay(today)
  return TERMS.map(({ label, startMonth, endMonth }) => {
    const year = now.getMonth() + 1 >= startMonth ? now.getFullYear() : now.getFullYear() - 1
    const start = toDayString(new Date(year, startMonth - 1, 1))
    // Day 0 of the following month is the last day of the term's final month.
    const end = toDayString(new Date(year, endMonth, 0))
    return { label, period: { start, end: end < today ? end : today } }
  })
}
