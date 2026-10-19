import { expect, test } from 'vitest'

import { formCode } from '@/lib/formCodes'

test('each kind of patient has its own form code', () => {
  expect(formCode({ patient_type: 'employee', education_level: null })).toBe('FM-SSA-MDS-8011')
  expect(formCode({ patient_type: 'student', education_level: 'basic_education' })).toBe(
    'FM-SSA-MDS-8012',
  )
  expect(formCode({ patient_type: 'student', education_level: 'college' })).toBe('FM-SSA-MDS-8013')
})

test('a student whose level is not on record is filed as college', () => {
  expect(formCode({ patient_type: 'student', education_level: null })).toBe('FM-SSA-MDS-8013')
})

test('an employee keeps the employee form whatever level is left over', () => {
  expect(formCode({ patient_type: 'employee', education_level: 'basic_education' })).toBe(
    'FM-SSA-MDS-8011',
  )
})
