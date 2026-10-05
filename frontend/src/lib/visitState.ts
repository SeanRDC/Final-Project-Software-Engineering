// How a visit is worded, coloured and timed wherever it is listed.

import type { PatientSummary, VisitSummary } from '@/api/types'
import type { StatusTone } from '@/components/StatusPill'
import { humanize, minutesBetween } from '@/lib/format'

// An open visit that has been waiting this long is drawn in amber, then red.
export const LONG_WAIT_MINUTES = 20
export const VERY_LONG_WAIT_MINUTES = 40

export type VisitState = {
  label: string
  tone: StatusTone
  /** What the minutes measure, for screen readers: "Open for", "Visit took". */
  timeLabel: string
  minutes: number
  /** The tone of the timer: only an open visit can run long. */
  waitTone: 'normal' | 'long' | 'very-long'
}

type VisitTiming = Pick<VisitSummary, 'status' | 'doctor_name' | 'checked_in_at' | 'completed_at'>

export function visitState(visit: VisitTiming, now: Date): VisitState {
  if (visit.status === 'completed') {
    return {
      label: 'Completed',
      tone: 'success',
      timeLabel: 'Visit took',
      minutes: minutesBetween(visit.checked_in_at, visit.completed_at ?? now),
      waitTone: 'normal',
    }
  }
  if (visit.status === 'cancelled') {
    return {
      label: 'Cancelled',
      tone: 'neutral',
      timeLabel: 'Checked in',
      minutes: 0,
      waitTone: 'normal',
    }
  }
  const minutes = minutesBetween(visit.checked_in_at, now)
  const waitTone =
    minutes >= VERY_LONG_WAIT_MINUTES
      ? 'very-long'
      : minutes >= LONG_WAIT_MINUTES
        ? 'long'
        : 'normal'
  // The doctor is recorded on a visit once they add consultation notes to it.
  if (visit.doctor_name) {
    return { label: 'In consultation', tone: 'consult', timeLabel: 'Open for', minutes, waitTone }
  }
  return { label: 'Open', tone: 'info', timeLabel: 'Open for', minutes, waitTone }
}

/** "20 yrs · Student", or just "Employee" when the record has no birth date. */
export function describePatient(patient: Pick<PatientSummary, 'age' | 'patient_type'>): string {
  const type = humanize(patient.patient_type)
  return patient.age === null ? type : `${patient.age} yrs · ${type}`
}
