import { ClockIcon, StethoscopeIcon } from 'lucide-react'

import type { VisitSummary } from '@/api/types'
import { StatusPill, type StatusTone } from '@/components/StatusPill'
import { formatDuration, humanize, minutesBetween } from '@/lib/format'
import { cn } from '@/lib/utils'

// An open visit that has been waiting this long is drawn in amber, then red.
const LONG_WAIT_MINUTES = 20
const VERY_LONG_WAIT_MINUTES = 40

type VisitState = {
  label: string
  tone: StatusTone
  /** What the minutes in the footer measure, for screen readers. */
  timeLabel: string
  minutes: number
}

function stateOf(visit: VisitSummary, now: Date): VisitState {
  if (visit.status === 'completed') {
    return {
      label: 'Completed',
      tone: 'success',
      timeLabel: 'Visit took',
      minutes: minutesBetween(visit.checked_in_at, visit.completed_at ?? now),
    }
  }
  if (visit.status === 'cancelled') {
    return { label: 'Cancelled', tone: 'neutral', timeLabel: 'Checked in', minutes: 0 }
  }
  const minutes = minutesBetween(visit.checked_in_at, now)
  // The doctor is recorded on a visit once they add consultation notes to it.
  if (visit.doctor_name) {
    return { label: 'In consultation', tone: 'consult', timeLabel: 'Open for', minutes }
  }
  return { label: 'Open', tone: 'info', timeLabel: 'Open for', minutes }
}

function describePatient(visit: VisitSummary): string {
  const { age, patient_type } = visit.patient
  const type = humanize(patient_type)
  return age === null ? type : `${age} yrs · ${type}`
}

type VisitCardProps = {
  visit: VisitSummary
  /** The current time, passed in so every card counts from the same moment. */
  now: Date
}

/** One entry of today's visit log. */
export function VisitCard({ visit, now }: VisitCardProps) {
  const state = stateOf(visit, now)
  const isOpen = visit.status === 'open'
  const isWithDoctor = isOpen && visit.doctor_name !== null

  return (
    <article
      aria-label={`${visit.patient.full_name}, ${state.label}`}
      className={cn(
        'flex flex-col rounded-md border bg-card p-3.5',
        isWithDoctor && 'border-primary ring-1 ring-primary',
        !isOpen && 'bg-muted/40',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="min-w-0 truncate text-base font-semibold">{visit.patient.full_name}</h3>
        <StatusPill tone={state.tone} className="shrink-0">
          {state.label}
        </StatusPill>
      </div>
      <p className="mt-0.5 text-sm text-muted-foreground">{describePatient(visit)}</p>
      <p className="mt-1.5 line-clamp-2 text-[15px]">{visit.complaint}</p>

      <div className="mt-3 flex items-center justify-between gap-3 border-t pt-2.5 text-[13px] text-muted-foreground">
        {visit.status === 'cancelled' ? (
          <span>Not seen</span>
        ) : (
          <span
            className={cn(
              'flex items-center gap-1.5 tabular-nums',
              isOpen && state.minutes >= LONG_WAIT_MINUTES && 'font-medium text-warning',
              isOpen && state.minutes >= VERY_LONG_WAIT_MINUTES && 'text-danger',
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
