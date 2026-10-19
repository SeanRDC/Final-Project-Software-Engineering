import { expect, test } from 'vitest'

import {
  bloodPressureError,
  formatBloodPressure,
  parseBloodPressure,
  tidyBloodPressure,
} from '@/lib/bloodPressure'

test('a space or a slash separates the two numbers as they are typed', () => {
  expect(tidyBloodPressure('120 ')).toBe('120/')
  expect(tidyBloodPressure('120 80')).toBe('120/80')
  expect(tidyBloodPressure('120 / 80')).toBe('120/80')
  expect(tidyBloodPressure('120//80')).toBe('120/80')
  expect(tidyBloodPressure(' 120/80 ')).toBe('120/80')
})

test('reads a reading into its two numbers', () => {
  expect(parseBloodPressure('120/80')).toEqual({ systolic: 120, diastolic: 80 })
  expect(parseBloodPressure('120 80')).toEqual({ systolic: 120, diastolic: 80 })
  expect(parseBloodPressure('')).toBeNull()
  expect(parseBloodPressure('120/')).toBeNull()
})

test('an empty box is fine, half a reading is not', () => {
  expect(bloodPressureError('')).toBeUndefined()
  expect(bloodPressureError('120/80')).toBeUndefined()
  expect(bloodPressureError('120/')).toBe('Enter both numbers, e.g. 120/80.')
  expect(bloodPressureError('120')).toBe('Enter both numbers, e.g. 120/80.')
  expect(bloodPressureError('12a/80')).toBe('Enter both numbers, e.g. 120/80.')
})

test('keeps each number within what the clinic can measure', () => {
  expect(bloodPressureError('1200/80')).toBe('The systolic value goes from 40 to 300.')
  expect(bloodPressureError('120/8')).toBe('The diastolic value goes from 20 to 200.')
  expect(bloodPressureError('80/120')).toBe(
    'The first number (systolic) should be higher than the second.',
  )
})

test('shows a saved reading as one value', () => {
  expect(formatBloodPressure(120, 80)).toBe('120/80')
  expect(formatBloodPressure(null, null)).toBe('')
  expect(formatBloodPressure(120, null)).toBe('')
})
