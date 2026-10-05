import { Link } from 'react-router'

import type { Appointment } from '@/api/types'
import { SectionCard } from '@/components/SectionCard'
import { formatClock } from '@/lib/format'

type TodaysEventsProps = {
  appointments: Appointment[]
}

/** The appointments still ahead today: pending approval or confirmed. */
export function TodaysEvents({ appointments }: TodaysEventsProps) {
  const upcoming = appointments.filter(
    (appointment) => appointment.status === 'pending' || appointment.status === 'confirmed',
  )

  return (
    <SectionCard title="Events for today">
      {upcoming.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          Nothing else is scheduled for today.
        </p>
      ) : (
        <ul className="divide-y">
          {upcoming.map((appointment) => (
            <li key={appointment.id} className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{appointment.patient.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {appointment.reason}
                  {appointment.status === 'pending' ? ' · awaiting approval' : ''}
                </p>
              </div>
              <time
                dateTime={appointment.start_time}
                className="shrink-0 pt-0.5 text-[13px] text-muted-foreground tabular-nums"
              >
                {formatClock(appointment.start_time)}
              </time>
            </li>
          ))}
        </ul>
      )}
      <div className="border-t px-4 py-3">
        <Link
          to="/appointments"
          className="rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          View all appointments
        </Link>
      </div>
    </SectionCard>
  )
}
