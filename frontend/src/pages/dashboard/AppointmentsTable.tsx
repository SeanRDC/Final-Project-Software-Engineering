import { CalendarDaysIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'

import type { Appointment } from '@/api/types'
import { SectionCard } from '@/components/SectionCard'
import { StatusPill } from '@/components/StatusPill'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTimeRange } from '@/lib/format'
import { APPOINTMENT_STATUS } from '@/lib/status'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

type AppointmentsTableProps = {
  appointments: Appointment[]
  /** Renders what goes in the last column of a row, e.g. the check-in button. */
  renderAction?: (appointment: Appointment) => ReactNode
}

export function AppointmentsTable({ appointments, renderAction }: AppointmentsTableProps) {
  return (
    <SectionCard
      title="Today's appointments"
      action={
        <Link to="/appointments" className="rounded-sm underline-offset-4 hover:underline">
          View calendar
        </Link>
      }
    >
      {appointments.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <CalendarDaysIcon />
            </EmptyMedia>
            <EmptyTitle>No appointments today</EmptyTitle>
            <EmptyDescription>Appointments booked for today are listed here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <Table>
          <TableHeader className="bg-muted/60">
            <TableRow className="hover:bg-transparent">
              <TableHead className={`${HEAD_CLASS} pl-4`}>Time</TableHead>
              <TableHead className={HEAD_CLASS}>Patient</TableHead>
              <TableHead className={HEAD_CLASS}>Reason</TableHead>
              <TableHead className={HEAD_CLASS}>Status</TableHead>
              {renderAction ? (
                <TableHead className="pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {appointments.map((appointment) => {
              const status = APPOINTMENT_STATUS[appointment.status]
              return (
                <TableRow key={appointment.id}>
                  <TableCell className="py-3 pl-4 text-[15px] whitespace-nowrap tabular-nums">
                    {formatTimeRange(appointment.start_time, appointment.end_time)}
                  </TableCell>
                  <TableCell className="py-3">
                    <div className="text-[15px] font-medium">{appointment.patient.full_name}</div>
                    <div className="text-[13px] text-muted-foreground tabular-nums">
                      {appointment.patient.id_number}
                    </div>
                  </TableCell>
                  <TableCell className="max-w-64 py-3 text-[15px] whitespace-normal">
                    {appointment.reason}
                  </TableCell>
                  <TableCell className="py-3">
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  </TableCell>
                  {renderAction ? (
                    <TableCell className="py-3 pr-4 text-right">
                      {renderAction(appointment)}
                    </TableCell>
                  ) : null}
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      )}
    </SectionCard>
  )
}
