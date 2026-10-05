import { useQuery } from '@tanstack/react-query'

import { api, ApiError } from '@/api/client'
import type { Appointment } from '@/api/types'
import { CheckInButton } from '@/components/CheckInButton'
import { SectionCard } from '@/components/SectionCard'
import { StatusPill } from '@/components/StatusPill'
import { Skeleton } from '@/components/ui/skeleton'
import { formatClock } from '@/lib/format'

/** Today's appointments that have not arrived yet. Confirmed ones can be checked in here. */
export function ArrivingByAppointment() {
  const { data, error, isPending } = useQuery({
    queryKey: ['appointments', 'today'],
    queryFn: ({ signal }) => api<Appointment[]>('/appointments/today', { signal }),
  })

  const expected = (data ?? []).filter(
    (appointment) => appointment.status === 'confirmed' || appointment.status === 'pending',
  )

  return (
    <SectionCard title="Arriving by appointment">
      {isPending ? (
        <div role="status" aria-label="Loading today's appointments" className="p-4">
          <Skeleton className="h-12" />
        </div>
      ) : null}

      {error ? (
        <p className="px-4 py-5 text-sm text-danger">
          {error instanceof ApiError ? error.message : 'Today’s appointments could not be loaded.'}
        </p>
      ) : null}

      {data && expected.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          No one else is expected by appointment today.
        </p>
      ) : null}

      {expected.length > 0 ? (
        <ul className="divide-y">
          {expected.map((appointment) => (
            <li key={appointment.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium">{appointment.patient.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  <span className="tabular-nums">{formatClock(appointment.start_time)}</span> ·{' '}
                  {appointment.reason}
                </p>
              </div>
              {appointment.status === 'confirmed' ? (
                <CheckInButton appointment={appointment} />
              ) : (
                <StatusPill tone="warning" className="shrink-0">
                  Pending
                </StatusPill>
              )}
            </li>
          ))}
        </ul>
      ) : null}

      {expected.some((appointment) => appointment.status === 'pending') ? (
        <p className="border-t px-4 py-3 text-[13px] text-muted-foreground">
          A pending appointment is waiting for the coordinator. If the patient is already here,
          check them in as a walk-in.
        </p>
      ) : null}
    </SectionCard>
  )
}
