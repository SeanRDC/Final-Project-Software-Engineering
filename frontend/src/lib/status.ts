// How each appointment state is worded and coloured, wherever it is shown.

import type { AppointmentStatus } from '@/api/types'
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
