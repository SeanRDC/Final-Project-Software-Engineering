import { Link } from 'react-router'

import type { VisitSummary } from '@/api/types'
import { StatusPill } from '@/components/StatusPill'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatDuration, formatTimeOfDay, humanize } from '@/lib/format'
import { cn } from '@/lib/utils'
import { describePatient, visitState } from '@/lib/visitState'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

type VisitsTableProps = {
  visits: VisitSummary[]
  now: Date
  /** Where a row's link leads, so the current filter survives opening a visit. */
  hrefFor: (visit: VisitSummary) => string
}

/** The day's visit log as a table. The patient's name opens the visit. */
export function VisitsTable({ visits, now, hrefFor }: VisitsTableProps) {
  return (
    <Table>
      <TableHeader className="bg-muted/60">
        <TableRow className="hover:bg-transparent">
          <TableHead className={cn(HEAD_CLASS, 'pl-4')}>Arrived</TableHead>
          <TableHead className={HEAD_CLASS}>Patient</TableHead>
          <TableHead className={HEAD_CLASS}>Complaint</TableHead>
          <TableHead className={HEAD_CLASS}>Type</TableHead>
          <TableHead className={HEAD_CLASS}>Status</TableHead>
          <TableHead className={HEAD_CLASS}>Time</TableHead>
          <TableHead className={cn(HEAD_CLASS, 'pr-4')}>Doctor</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {visits.map((visit) => {
          const state = visitState(visit, now)
          return (
            <TableRow key={visit.id} className="relative">
              <TableCell className="py-3 pl-4 text-[15px] whitespace-nowrap tabular-nums">
                {formatTimeOfDay(visit.checked_in_at)}
              </TableCell>
              <TableCell className="py-3">
                {/* The link's hit area is stretched over the whole row. */}
                <Link
                  to={hrefFor(visit)}
                  className="rounded-sm text-[15px] font-medium outline-none after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {visit.patient.full_name}
                </Link>
                <div className="text-[13px] text-muted-foreground">
                  <span className="tabular-nums">{visit.patient.id_number}</span> ·{' '}
                  {describePatient(visit.patient)}
                </div>
              </TableCell>
              <TableCell className="max-w-72 py-3 text-[15px] whitespace-normal">
                {visit.complaint}
              </TableCell>
              <TableCell className="py-3 text-sm text-muted-foreground">
                {humanize(visit.visit_type)}
              </TableCell>
              <TableCell className="py-3">
                <StatusPill tone={state.tone}>{state.label}</StatusPill>
              </TableCell>
              <TableCell
                className={cn(
                  'py-3 text-sm whitespace-nowrap tabular-nums',
                  state.waitTone === 'long' && 'font-medium text-warning',
                  state.waitTone === 'very-long' && 'font-medium text-danger',
                )}
              >
                <span className="sr-only">{state.timeLabel} </span>
                {formatDuration(state.minutes)}
              </TableCell>
              <TableCell className="py-3 pr-4 text-sm">
                {visit.doctor_name ?? <span className="text-muted-foreground">—</span>}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
