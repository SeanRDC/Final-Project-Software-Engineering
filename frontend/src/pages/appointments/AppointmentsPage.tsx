import {
  CalendarDaysIcon,
  CalendarPlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleAlertIcon,
} from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { ApiError } from '@/api/client'
import { useCan } from '@/auth/permissions'
import { MonthCalendar } from '@/components/calendar/MonthCalendar'
import { SectionCard } from '@/components/SectionCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { parseDay, toDayString } from '@/lib/format'
import { useClinicToday } from '@/lib/useClinicToday'
import { AppointmentList } from '@/pages/appointments/AppointmentList'
import { useAppointmentsForDay, usePendingAppointments } from '@/pages/appointments/useAppointments'

const DAY = /^\d{4}-\d{2}-\d{2}$/

function shiftDay(day: string, by: number): string {
  const date = parseDay(day)
  date.setDate(date.getDate() + by)
  return toDayString(date)
}

function longDay(day: string): string {
  return parseDay(day).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Appointments: a month calendar, one day's schedule, and what awaits the coordinator. */
export function AppointmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const allowed = useCan()
  const today = useClinicToday()

  // The day on screen lives in the address; the dashboard calendar links straight to a day.
  const dateParam = searchParams.get('date') ?? ''
  const day = DAY.test(dateParam) ? dateParam : today
  const { data, error, isPending } = useAppointmentsForDay(day)
  const pending = usePendingAppointments(true)
  // The day's own pending appointments are already in its schedule.
  const pendingElsewhere = (pending.data?.items ?? []).filter(
    (appointment) => appointment.scheduled_date !== day,
  )
  const canBook = allowed('appointments:write')

  function goTo(next: string) {
    setSearchParams(next === today ? {} : { date: next })
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <div className="flex flex-col gap-4">
        {/* Keyed by month, so stepping through days turns the calendar's page with them. */}
        <MonthCalendar key={day.slice(0, 7)} today={today} selected={day} />
        {canBook ? (
          <Button asChild size="lg" className="h-10 px-4">
            <Link to={`/appointments/new?date=${day < today ? today : day}`}>
              <CalendarPlusIcon data-icon="inline-start" />
              New appointment
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-6">
        <section aria-label="Schedule" className="overflow-hidden rounded-lg border bg-card">
          <header className="flex min-h-10 flex-wrap items-center justify-between gap-2 bg-header px-2 py-1.5 text-header-foreground">
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Previous day"
                className="flex size-8 items-center justify-center rounded-md outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70"
                onClick={() => goTo(shiftDay(day, -1))}
              >
                <ChevronLeftIcon aria-hidden="true" className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next day"
                className="flex size-8 items-center justify-center rounded-md outline-none hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70"
                onClick={() => goTo(shiftDay(day, 1))}
              >
                <ChevronRightIcon aria-hidden="true" className="size-4" />
              </button>
              <h2 aria-live="polite" className="ml-1 text-[15px] font-semibold">
                {longDay(day)}
                {day === today ? ' · Today' : ''}
              </h2>
            </div>
            {day !== today ? (
              <button
                type="button"
                className="rounded-sm px-2 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-white/70"
                onClick={() => goTo(today)}
              >
                Go to today
              </button>
            ) : null}
          </header>

          {isPending ? (
            <div
              role="status"
              aria-label="Loading the schedule"
              className="flex flex-col gap-2 p-4"
            >
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : null}

          {error ? (
            <div className="p-4">
              <Alert variant="destructive">
                <CircleAlertIcon />
                <AlertTitle>The schedule could not be loaded</AlertTitle>
                <AlertDescription>
                  {error instanceof ApiError ? error.message : 'Something went wrong.'}
                </AlertDescription>
              </Alert>
            </div>
          ) : null}

          {data && data.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <CalendarDaysIcon />
                </EmptyMedia>
                <EmptyTitle>No appointments on this day</EmptyTitle>
                <EmptyDescription>
                  {day < today
                    ? 'Nothing was booked for this day.'
                    : 'Nothing is booked for this day yet.'}
                </EmptyDescription>
              </EmptyHeader>
              {canBook && day >= today ? (
                <EmptyContent>
                  <Button asChild variant="outline">
                    <Link to={`/appointments/new?date=${day}`}>Book an appointment</Link>
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : null}

          {data && data.length > 0 ? <AppointmentList appointments={data} today={today} /> : null}
        </section>

        {pendingElsewhere.length > 0 ? (
          <SectionCard
            title={
              allowed('appointments:decide')
                ? 'Waiting for your confirmation'
                : 'Waiting for the coordinator'
            }
          >
            <AppointmentList appointments={pendingElsewhere} today={today} showDate />
          </SectionCard>
        ) : null}
      </div>
    </div>
  )
}
