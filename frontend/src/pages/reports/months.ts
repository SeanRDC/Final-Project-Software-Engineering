// Fills the gaps in a report's month-by-month visit counts.

import type { CountItem } from '@/api/types'

/**
 * The server lists only the months that had visits ("2026-08"). This adds the months
 * in between with a count of zero, so a quiet month shows as a gap in the trend.
 */
export function fillMonths(items: CountItem[]): CountItem[] {
  const first = items[0]
  const last = items.at(-1)
  if (!first || !last) return []
  const counts = new Map(items.map((item) => [item.label, item.count]))
  const [endYear = 0, endMonth = 0] = last.label.split('-').map(Number)
  let [year = 0, month = 0] = first.label.split('-').map(Number)
  const filled: CountItem[] = []
  while (year < endYear || (year === endYear && month <= endMonth)) {
    const label = `${year}-${String(month).padStart(2, '0')}`
    filled.push({ label, count: counts.get(label) ?? 0 })
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
  return filled
}
