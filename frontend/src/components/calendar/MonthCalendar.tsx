import { useQuery } from '@tanstack/react-query'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'

import { api } from '@/api/client'
import type { CalendarDay } from '@/api/types'
import { parseDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  monthGrid,
  monthLabel,
  monthOf,
  shiftMonth,
  type CalendarCell,
  type MonthRef,
} from '@/components/calendar/calendarGrid'

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

function cellLabel(cell: CalendarCell, isToday: boolean, count: number): string {
  const date = parseDay(cell.day).toLocaleDateString('en-US', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const parts = [date]
  if (isToday) parts.push('today')
  if (count > 0) parts.push(`${count} ${count === 1 ? 'appointment' : 'appointments'}`)
  return parts.join(', ')
}

type MonthCalendarProps = {
  /** The clinic's current day, "2026-10-04". */
  today: string
  /** Days of the current month that have appointments, from the dashboard payload. */
  days: CalendarDay[]
}

/** Month view with a dot on each day that has appointments. Each day opens its appointments. */
export function MonthCalendar({ today, days }: MonthCalendarProps) {
  const currentMonth = monthOf(today)
  const [viewed, setViewed] = useState<MonthRef>(currentMonth)
  const isCurrentMonth = viewed.year === currentMonth.year && viewed.month === currentMonth.month

  // The dashboard already carries the current month; other months are fetched when opened.
  const otherMonth = useQuery({
    queryKey: ['appointments', 'calendar', viewed.year, viewed.month],
    queryFn: ({ signal }) =>
      api<CalendarDay[]>('/appointments/calendar', {
        query: { year: viewed.year, month: viewed.month },
        signal,
      }),
    enabled: !isCurrentMonth,
  })

  const shownDays = isCurrentMonth ? days : (otherMonth.data ?? [])
  const counts = new Map(shownDays.map((day) => [day.date, day.appointment_count]))
  const label = monthLabel(viewed)

  return (
    <section
      aria-label="Appointment calendar"
      className="overflow-hidden rounded-lg border bg-card"
    >
      <header className="flex h-10 items-center justify-between bg-header px-1.5 text-header-foreground">
        <button
          type="button"
          aria-label="Previous month"
          className="flex size-8 items-center justify-center rounded-md outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70"
          onClick={() => setViewed((month) => shiftMonth(month, -1))}
        >
          <ChevronLeftIcon aria-hidden="true" className="size-4" />
        </button>
        <h2 aria-live="polite" className="text-[15px] font-semibold">
          {label}
        </h2>
        <button
          type="button"
          aria-label="Next month"
          className="flex size-8 items-center justify-center rounded-md outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70"
          onClick={() => setViewed((month) => shiftMonth(month, 1))}
        >
          <ChevronRightIcon aria-hidden="true" className="size-4" />
        </button>
      </header>

      <table className="w-full table-fixed border-separate border-spacing-0 p-2 text-center">
        <caption className="sr-only">{label}</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday, index) => (
              <th
                key={weekday}
                scope="col"
                abbr={weekday}
                className={cn(
                  'h-8 text-xs font-medium text-muted-foreground',
                  index === 0 && 'text-danger',
                )}
              >
                {weekday.slice(0, 3)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(viewed).map((week) => (
            <tr key={week[0]?.day}>
              {week.map((cell) => {
                const isToday = cell.day === today
                const count = counts.get(cell.day) ?? 0
                return (
                  <td key={cell.day} className="p-0">
                    <Link
                      to={`/appointments?date=${cell.day}`}
                      aria-label={cellLabel(cell, isToday, count)}
                      aria-current={isToday ? 'date' : undefined}
                      className="group relative mx-auto flex h-[38px] w-full flex-col items-center rounded-md pt-1 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span
                        className={cn(
                          'flex size-7 items-center justify-center rounded-full text-sm tabular-nums group-hover:bg-muted',
                          cell.isSunday && 'text-danger',
                          !cell.inMonth && 'text-muted-foreground/70',
                          isToday &&
                            'bg-primary font-semibold text-primary-foreground group-hover:bg-primary',
                        )}
                      >
                        {cell.dayOfMonth}
                      </span>
                      {count > 0 ? (
                        <span
                          aria-hidden="true"
                          data-testid="appointment-dot"
                          className="mt-px size-1 rounded-full bg-foreground/60"
                        />
                      ) : null}
                    </Link>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
