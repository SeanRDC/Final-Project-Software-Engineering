import { expect, test } from 'vitest'

import { describePatient, visitState } from '@/lib/visitState'
import { FIXTURE_NOW, visit } from '@/test/dashboardFixture'

test('an open visit counts from check-in', () => {
  expect(visitState(visit(), FIXTURE_NOW)).toMatchObject({
    label: 'Open',
    tone: 'info',
    minutes: 6,
    waitTone: 'normal',
  })
})

test('an open visit turns long at 20 minutes and very long at 40', () => {
  const at = (minutesAgo: number) =>
    visit({ checked_in_at: new Date(FIXTURE_NOW.getTime() - minutesAgo * 60_000).toISOString() })

  expect(visitState(at(19), FIXTURE_NOW).waitTone).toBe('normal')
  expect(visitState(at(20), FIXTURE_NOW).waitTone).toBe('long')
  expect(visitState(at(40), FIXTURE_NOW).waitTone).toBe('very-long')
})

test('a visit the doctor has added notes to is in consultation', () => {
  expect(visitState(visit({ doctor_name: 'Dr. Villareal' }), FIXTURE_NOW)).toMatchObject({
    label: 'In consultation',
    tone: 'consult',
  })
})

test('a completed visit measures check-in to completion and never runs long', () => {
  const completed = visit({
    status: 'completed',
    checked_in_at: '2026-10-04T00:10:00+00:00',
    completed_at: '2026-10-04T01:20:00+00:00',
  })

  expect(visitState(completed, FIXTURE_NOW)).toMatchObject({
    label: 'Completed',
    minutes: 70,
    waitTone: 'normal',
  })
})

test('a cancelled visit has no timer', () => {
  expect(visitState(visit({ status: 'cancelled' }), FIXTURE_NOW)).toMatchObject({
    label: 'Cancelled',
    minutes: 0,
  })
})

test('describes a patient by age and type', () => {
  expect(describePatient({ age: 20, patient_type: 'student' })).toBe('20 yrs · Student')
  expect(describePatient({ age: null, patient_type: 'employee' })).toBe('Employee')
})
