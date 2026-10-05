// The logic behind the appointment form, used both to book and to reschedule:
// starting values, what makes a field invalid, and what is sent to the server.

import type { Appointment, AppointmentCreate, AppointmentUpdate } from '@/api/types'
import { toDayString } from '@/lib/format'

export type AppointmentValues = {
  /** "2026-10-12" */
  scheduled_date: string
  /** "14:00", as a time input holds it. */
  start_time: string
  end_time: string
  reason: string
  notes: string
}

export type AppointmentErrors = Partial<Record<keyof AppointmentValues | 'patient', string>>

/** How long a new appointment lasts until someone says otherwise. */
const DEFAULT_MINUTES = 30

/** "14:00:00" or "14:00" -> "14:00". */
export function toTimeInput(time: string): string {
  return time.slice(0, 5)
}

/** "09:45" + 30 -> "10:15". Stops at the end of the day rather than wrapping past midnight. */
export function addMinutes(time: string, minutes: number): string {
  const [hours = 0, mins = 0] = time.split(':').map(Number)
  const total = Math.min(hours * 60 + mins + minutes, 23 * 60 + 59)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

export function defaultEnd(start: string): string {
  return start ? addMinutes(start, DEFAULT_MINUTES) : ''
}

export function emptyAppointment(date: string): AppointmentValues {
  return { scheduled_date: date, start_time: '', end_time: '', reason: '', notes: '' }
}

export function appointmentValues(appointment: Appointment): AppointmentValues {
  return {
    scheduled_date: appointment.scheduled_date,
    start_time: toTimeInput(appointment.start_time),
    end_time: toTimeInput(appointment.end_time),
    reason: appointment.reason,
    notes: appointment.notes ?? '',
  }
}

export function validateAppointment(
  values: AppointmentValues,
  options: { hasPatient: boolean; today?: Date },
): AppointmentErrors {
  const errors: AppointmentErrors = {}
  const today = toDayString(options.today ?? new Date())

  if (!options.hasPatient) errors.patient = 'Choose the patient.'
  if (!values.scheduled_date) errors.scheduled_date = 'Choose the date.'
  else if (values.scheduled_date < today) {
    errors.scheduled_date = 'An appointment cannot be in the past.'
  }
  if (!values.start_time) errors.start_time = 'Enter the start time.'
  if (!values.end_time) errors.end_time = 'Enter the end time.'
  else if (values.start_time && values.end_time <= values.start_time) {
    errors.end_time = 'The end time must be after the start time.'
  }
  if (!values.reason.trim()) errors.reason = 'Enter the reason for the appointment.'
  else if (values.reason.trim().length > 255) errors.reason = 'Use 255 characters or fewer.'
  return errors
}

export function createRequest(patientId: number, values: AppointmentValues): AppointmentCreate {
  return {
    patient_id: patientId,
    scheduled_date: values.scheduled_date,
    start_time: values.start_time,
    end_time: values.end_time,
    reason: values.reason.trim(),
    notes: values.notes.trim() || null,
  }
}

/** Only what differs from the saved appointment. */
export function appointmentChanges(
  appointment: Appointment,
  values: AppointmentValues,
): AppointmentUpdate {
  const saved = appointmentValues(appointment)
  const changes: AppointmentUpdate = {}
  if (values.scheduled_date !== saved.scheduled_date) changes.scheduled_date = values.scheduled_date
  if (values.start_time !== saved.start_time) changes.start_time = values.start_time
  if (values.end_time !== saved.end_time) changes.end_time = values.end_time
  if (values.reason.trim() !== saved.reason) changes.reason = values.reason.trim()
  if (values.notes.trim() !== saved.notes) changes.notes = values.notes.trim() || null
  return changes
}

/** True when the change moves the appointment, which sends a confirmed one back for approval. */
export function isReschedule(changes: AppointmentUpdate): boolean {
  return 'scheduled_date' in changes || 'start_time' in changes || 'end_time' in changes
}
