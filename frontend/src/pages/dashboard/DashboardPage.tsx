import { CircleAlertIcon, RefreshCwIcon } from 'lucide-react'

import { ApiError } from '@/api/client'
import { useCan } from '@/auth/permissions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { AppointmentsTable } from '@/pages/dashboard/AppointmentsTable'
import { CheckInButton } from '@/pages/dashboard/CheckInButton'
import { DashboardSkeleton } from '@/pages/dashboard/DashboardSkeleton'
import { MonthCalendar } from '@/pages/dashboard/MonthCalendar'
import { NotificationsPanel } from '@/pages/dashboard/NotificationsPanel'
import { QuickActions } from '@/pages/dashboard/QuickActions'
import { StatTiles } from '@/pages/dashboard/StatTiles'
import { TodaysEvents } from '@/pages/dashboard/TodaysEvents'
import { TodaysVisits } from '@/pages/dashboard/TodaysVisits'
import { useDashboard } from '@/pages/dashboard/useDashboard'

function errorMessage(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong while loading the dashboard.'
}

/** The Clinic Main Menu: today's activity at a glance. */
export function DashboardPage() {
  const { data, error, isPending, isFetching, refetch } = useDashboard()
  const allowed = useCan()
  const canCheckIn = allowed('visits:record')

  return (
    <div className="flex flex-col gap-6">
      <QuickActions />

      {/* A failed refresh keeps the last figures on screen and says they may be out of date. */}
      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            {data ? 'The dashboard could not be refreshed' : 'The dashboard could not be loaded'}
          </AlertTitle>
          <AlertDescription>
            <p>{errorMessage(error)}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 bg-card text-foreground"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? <DashboardSkeleton /> : null}

      {data ? (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="flex min-w-0 flex-col gap-6">
            <StatTiles stats={data.stats} lowStock={data.low_stock} />
            <TodaysVisits visits={data.todays_visits} />
            <AppointmentsTable
              appointments={data.todays_appointments}
              renderAction={
                canCheckIn
                  ? (appointment) =>
                      appointment.status === 'confirmed' ? (
                        <CheckInButton appointment={appointment} />
                      ) : null
                  : undefined
              }
            />
          </div>
          <aside aria-label="Calendar and alerts" className="flex min-w-0 flex-col gap-6">
            <MonthCalendar today={data.date} days={data.calendar} />
            <TodaysEvents appointments={data.todays_appointments} />
            <NotificationsPanel notifications={data.notifications} />
          </aside>
        </div>
      ) : null}
    </div>
  )
}
