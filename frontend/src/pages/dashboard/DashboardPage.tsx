import { useCan } from '@/auth/permissions'
import { AppointmentsTable } from '@/pages/dashboard/AppointmentsTable'
import { CheckInButton } from '@/pages/dashboard/CheckInButton'
import { QuickActions } from '@/pages/dashboard/QuickActions'
import { StatTiles } from '@/pages/dashboard/StatTiles'
import { TodaysVisits } from '@/pages/dashboard/TodaysVisits'
import { useDashboard } from '@/pages/dashboard/useDashboard'

/** The Clinic Main Menu: today's activity at a glance. */
export function DashboardPage() {
  const { data } = useDashboard()
  const allowed = useCan()
  const canCheckIn = allowed('visits:record')

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
      <div className="flex min-w-0 flex-col gap-6">
        <QuickActions />
        {data ? (
          <>
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
          </>
        ) : null}
      </div>
      <aside aria-label="Calendar and alerts" className="flex min-w-0 flex-col gap-6" />
    </div>
  )
}
