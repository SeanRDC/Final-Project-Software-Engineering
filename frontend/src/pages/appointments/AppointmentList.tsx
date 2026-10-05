import { Link } from 'react-router'

import type { Appointment } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { StatusPill } from '@/components/StatusPill'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTimeRange, parseDay } from '@/lib/format'
import { APPOINTMENT_STATUS } from '@/lib/status'
import { cn } from '@/lib/utils'
import { AppointmentActions } from '@/pages/appointments/AppointmentActions'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

function shortDay(day: string): string {
  return parseDay(day).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

type AppointmentListProps = {
  appointments: Appointment[]
  today: string
  /** Show each appointment's date, for a list that spans several days. */
  showDate?: boolean
}

/** Appointments as a table with the actions each one allows. */
export function AppointmentList({ appointments, today, showDate = false }: AppointmentListProps) {
  const allowed = useCan()
  const canOpenPatient = allowed('patients:read')

  return (
    <Table>
      <TableHeader className="bg-muted/60">
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(HEAD_CLASS, 'pl-4')}>{showDate ? 'When' : 'Time'}</TableHead>
          <TableHead className={HEAD_CLASS}>Patient</TableHead>
          <TableHead className={HEAD_CLASS}>Reason</TableHead>
          <TableHead className={HEAD_CLASS}>Status</TableHead>
          <TableHead className="pr-4">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {appointments.map((appointment) => {
          const status = APPOINTMENT_STATUS[appointment.status]
          const detail =
            appointment.status === 'cancelled'
              ? (appointment.cancellation_reason ?? appointment.notes)
              : appointment.notes
          return (
            <TableRow key={appointment.id}>
              <TableCell className="py-3 pl-4 text-[15px] whitespace-nowrap tabular-nums">
                {showDate ? (
                  <Link
                    to={`/appointments?date=${appointment.scheduled_date}`}
                    className="block rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {shortDay(appointment.scheduled_date)}
                  </Link>
                ) : null}
                {formatTimeRange(appointment.start_time, appointment.end_time)}
              </TableCell>
              <TableCell className="py-3">
                {canOpenPatient ? (
                  <Link
                    to={`/patients/${appointment.patient.id}`}
                    className="rounded-sm text-[15px] font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {appointment.patient.full_name}
                  </Link>
                ) : (
                  <span className="text-[15px] font-medium">{appointment.patient.full_name}</span>
                )}
                <div className="text-[13px] text-muted-foreground tabular-nums">
                  {appointment.patient.id_number}
                </div>
              </TableCell>
              <TableCell className="max-w-72 py-3 whitespace-normal">
                <div className="text-[15px]">{appointment.reason}</div>
                {detail ? <div className="text-[13px] text-muted-foreground">{detail}</div> : null}
              </TableCell>
              <TableCell className="py-3">
                <StatusPill tone={status.tone}>{status.label}</StatusPill>
                {appointment.decided_by_name && appointment.status !== 'pending' ? (
                  <div className="mt-0.5 text-[12px] text-muted-foreground">
                    by {appointment.decided_by_name}
                  </div>
                ) : null}
              </TableCell>
              <TableCell className="py-3 pr-4">
                <AppointmentActions appointment={appointment} today={today} />
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
