import { expect, test } from 'vitest'

import {
  addMinutes,
  appointmentChanges,
  appointmentValues,
  createRequest,
  defaultEnd,
  emptyAppointment,
  isReschedule,
  validateAppointment,
} from '@/pages/appointments/appointmentValues'
import { appointment } from '@/test/dashboardFixture'

const TODAY = new Date(2026, 9, 6)
const valid = {
  scheduled_date: '2026-10-12',
  start_time: '14:00',
  end_time: '14:30',
  reason: 'BP monitoring',
  notes: '',
}

test('adds minutes to a time and stops at the end of the day', () => {
  expect(addMinutes('09:45', 30)).toBe('10:15')
  expect(addMinutes('23:50', 30)).toBe('23:59')
  expect(defaultEnd('14:00')).toBe('14:30')
  expect(defaultEnd('')).toBe('')
})

test('a blank form needs the patient, the time and the reason', () => {
  expect(
    validateAppointment(emptyAppointment('2026-10-12'), { hasPatient: false, today: TODAY }),
  ).toEqual({
    patient: 'Choose the patient.',
    start_time: 'Enter the start time.',
    end_time: 'Enter the end time.',
    reason: 'Enter the reason for the appointment.',
  })
})

test('accepts a complete appointment today or later', () => {
  expect(validateAppointment(valid, { hasPatient: true, today: TODAY })).toEqual({})
  expect(
    validateAppointment(
      { ...valid, scheduled_date: '2026-10-06' },
      { hasPatient: true, today: TODAY },
    ),
  ).toEqual({})
})

test('refuses a past date and an end that is not after the start', () => {
  const errors = validateAppointment(
    { ...valid, scheduled_date: '2026-10-05', end_time: '14:00' },
    { hasPatient: true, today: TODAY },
  )

  expect(errors.scheduled_date).toBe('An appointment cannot be in the past.')
  expect(errors.end_time).toBe('The end time must be after the start time.')
})

test('builds the booking request', () => {
  expect(
    createRequest(7, { ...valid, reason: ' BP monitoring ', notes: ' Bring logbook ' }),
  ).toEqual({
    patient_id: 7,
    scheduled_date: '2026-10-12',
    start_time: '14:00',
    end_time: '14:30',
    reason: 'BP monitoring',
    notes: 'Bring logbook',
  })
})

test('reads a saved appointment into the form, dropping the seconds', () => {
  expect(appointmentValues(appointment())).toEqual({
    scheduled_date: '2026-10-04',
    start_time: '10:30',
    end_time: '11:00',
    reason: 'Medical clearance for PE',
    notes: '',
  })
})

test('an untouched appointment has nothing to send', () => {
  const saved = appointment()

  expect(appointmentChanges(saved, appointmentValues(saved))).toEqual({})
})

test('sends only what changed and knows a move from an edit', () => {
  const saved = appointment()
  const moved = appointmentChanges(saved, {
    ...appointmentValues(saved),
    start_time: '11:00',
    end_time: '11:30',
  })
  const reworded = appointmentChanges(saved, { ...appointmentValues(saved), notes: 'Fasting' })

  expect(moved).toEqual({ start_time: '11:00', end_time: '11:30' })
  expect(isReschedule(moved)).toBe(true)
  expect(reworded).toEqual({ notes: 'Fasting' })
  expect(isReschedule(reworded)).toBe(false)
})
