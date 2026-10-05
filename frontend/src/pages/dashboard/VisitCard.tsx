import { ClockIcon, StethoscopeIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { VisitSummary } from '@/api/types'
import { StatusPill } from '@/components/StatusPill'
import { formatDuration, humanize } from '@/lib/format'
import { cn } from '@/lib/utils'
import { describePatient, visitState } from '@/lib/visitState'

type VisitCardProps = {
  visit: VisitSummary
  /** The current time, passed in so every card counts from the same moment. */
  now: Date
}

/** One entry of today's visit log. The whole card opens the visit. */
export function VisitCard({ visit, now }: VisitCardProps) {
  const state = visitState(visit, now)
  const isOpen = visit.status === 'open'
  const isWithDoctor = isOpen && visit.doctor_name !== null

  return (
    <article
      aria-label={`${visit.patient.full_name}, ${state.label}`}
      className={cn(
        'relative flex flex-col rounded-md border bg-card p-3.5 focus-within:ring-2 focus-within:ring-ring hover:border-foreground/30',
        isWithDoctor && 'border-primary ring-1 ring-primary',
        !isOpen && 'bg-muted/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-base font-semibold">
          {/* The link's hit area is stretched over the whole card. */}
          <Link to={`/visits/${visit.id}`} className="outline-none after:absolute after:inset-0">
            {visit.patient.full_name}
          </Link>
        </h3>
        <StatusPill tone={state.tone} className="shrink-0">
          {state.label}
        </StatusPill>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{describePatient(visit.patient)}</p>
      <p className="mt-1.5 line-clamp-2 text-[15px]">{visit.complaint}</p>

      <div className="mt-3 flex items-center justify-between gap-3 border-t pt-2.5 text-[13px] text-muted-foreground">
        {visit.status === 'cancelled' ? (
          <span>Not seen</span>
        ) : (
          <span
            className={cn(
              'flex items-center gap-1.5 tabular-nums',
              state.waitTone === 'long' && 'font-medium text-warning',
              state.waitTone === 'very-long' && 'font-medium text-danger',
            )}
          >
            <ClockIcon aria-hidden="true" className="size-3.5" />
            <span className="sr-only">{state.timeLabel}</span>
            {formatDuration(state.minutes)}
          </span>
        )}
        {visit.doctor_name ? (
          <span className="flex min-w-0 items-center gap-1.5 text-primary">
            <StethoscopeIcon aria-hidden="true" className="size-3.5 shrink-0" />
            <span className="truncate">{visit.doctor_name}</span>
          </span>
        ) : (
          <span className="truncate">{humanize(visit.visit_type)}</span>
        )}
      </div>
    </article>
  )
}
