import { expect, test } from 'vitest'

import { describeDetail } from '@/pages/audit/auditDetail'

test('turns the stored JSON into readable pairs', () => {
  expect(describeDetail('{"patient_id": 1, "filename": "cbc.pdf"}')).toBe(
    'patient id: 1 · filename: cbc.pdf',
  )
  expect(describeDetail('{"fields": ["allergies", "contact_number"]}')).toBe(
    'fields: allergies, contact_number',
  )
})

test('shows anything else as it was written', () => {
  expect(describeDetail('username=nurse')).toBe('username=nurse')
  expect(describeDetail('[1, 2]')).toBe('[1, 2]')
})

test('shows a dash when there is no detail', () => {
  expect(describeDetail(null)).toBe('—')
  expect(describeDetail('')).toBe('—')
})
