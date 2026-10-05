// Lays a month out as the rows of a calendar, Sunday first.

import { toDayString } from '@/lib/format'

export type CalendarCell = {
  /** "2026-10-04" */
  day: string
  dayOfMonth: number
  /** False for the days of the previous and next month that fill the first and last rows. */
  inMonth: boolean
  isSunday: boolean
}

export type MonthRef = {
  year: number
  /** 1 to 12, as the API counts months. */
  month: number
}

export function monthOf(day: string): MonthRef {
  const [year = 1970, month = 1] = day.split('-').map(Number)
  return { year, month }
}

export function shiftMonth({ year, month }: MonthRef, by: number): MonthRef {
  const shifted = new Date(year, month - 1 + by, 1)
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 }
}

export function monthLabel({ year, month }: MonthRef): string {
  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

/** The weeks that cover the month, each with seven days. */
export function monthGrid({ year, month }: MonthRef): CalendarCell[][] {
  const first = new Date(year, month - 1, 1)
  const daysInMonth = new Date(year, month, 0).getDate()
  const weekCount = Math.ceil((first.getDay() + daysInMonth) / 7)

  const weeks: CalendarCell[][] = []
  for (let week = 0; week < weekCount; week += 1) {
    const cells: CalendarCell[] = []
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const date = new Date(year, month - 1, 1 - first.getDay() + week * 7 + weekday)
      cells.push({
        day: toDayString(date),
        dayOfMonth: date.getDate(),
        inMonth: date.getMonth() === month - 1,
        isSunday: weekday === 0,
      })
    }
    weeks.push(cells)
  }
  return weeks
}
