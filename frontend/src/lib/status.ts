// How each appointment state is worded and coloured, wherever it is shown.

import type { AppointmentStatus, VisitDisposition, VisitType } from '@/api/types'
import type { StatusTone } from '@/components/StatusPill'

type StatusDisplay = {
  label: string
  tone: StatusTone
}

export const APPOINTMENT_STATUS: Record<AppointmentStatus, StatusDisplay> = {
  pending: { label: 'Pending', tone: 'warning' },
  confirmed: { label: 'Confirmed', tone: 'info' },
  checked_in: { label: 'Checked in', tone: 'consult' },
  completed: { label: 'Completed', tone: 'success' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
  no_show: { label: 'No show', tone: 'danger' },
}

/** The reasons for a visit, in the order the check-in form offers them. */
export const VISIT_TYPES = [
  'consultation',
  'medicine_request',
  'treatment',
  'medical_clearance',
  'excuse_letter',
  'follow_up',
  'monitoring',
  'other',
] as const satisfies readonly VisitType[]

/** How a visit ended, in the order the forms offer them. */
export const DISPOSITIONS: { value: VisitDisposition; label: string }[] = [
  { value: 'returned', label: 'Returned to class or work' },
  { value: 'sent_home', label: 'Sent home' },
  { value: 'referred', label: 'Referred elsewhere' },
  { value: 'admitted', label: 'Admitted' },
]

export function dispositionLabel(value: VisitDisposition): string {
  return DISPOSITIONS.find((option) => option.value === value)?.label ?? value
}
