// How kits and loans are named and coloured on screen.

import type { MedkitRequestStatus, MedkitStatus } from '@/api/types'
import type { StatusTone } from '@/components/StatusPill'
import { parseDay } from '@/lib/format'

type Display = { label: string; tone: StatusTone }

export const REQUEST_STATUS: Record<MedkitRequestStatus, Display> = {
  requested: { label: 'Requested', tone: 'info' },
  issued: { label: 'Out', tone: 'warning' },
  returned: { label: 'Returned', tone: 'success' },
  lost: { label: 'Lost', tone: 'danger' },
  cancelled: { label: 'Cancelled', tone: 'neutral' },
}

export const KIT_STATUS: Record<MedkitStatus, Display> = {
  available: { label: 'Available', tone: 'success' },
  out: { label: 'Out', tone: 'warning' },
  lost: { label: 'Lost', tone: 'danger' },
}

/** The state of a loan, with "Overdue" in place of "Out" once the activity has passed. */
export function requestState(request: {
  status: MedkitRequestStatus
  is_overdue: boolean
}): Display {
  return request.is_overdue ? { label: 'Overdue', tone: 'danger' } : REQUEST_STATUS[request.status]
}

/** "Kit #3 · Grey box" */
export function kitName(kit: { kit_number: number; label: string | null }): string {
  return kit.label ? `Kit #${kit.kit_number} · ${kit.label}` : `Kit #${kit.kit_number}`
}

/** "Oct 5, 2026" */
export function formatShortDay(day: string): string {
  return parseDay(day).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}
