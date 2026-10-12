import { expect, test } from 'vitest'

import { outcomeLabel, RELEASE_DISPOSITIONS } from '@/lib/status'

test('an outcome is worded as the forms offer it', () => {
  expect(outcomeLabel({ disposition: null, release_disposition: null })).toBeNull()
  expect(outcomeLabel({ disposition: 'sent_home', release_disposition: null })).toBe('Sent home')
  expect(outcomeLabel({ disposition: 'admitted', release_disposition: null })).toBe('Admitted')
})

test('an admission says where the patient went afterwards', () => {
  expect(outcomeLabel({ disposition: 'admitted', release_disposition: 'returned' })).toBe(
    'Admitted, then returned to class or work',
  )
})

test('a patient is not released from admission into admission', () => {
  expect(RELEASE_DISPOSITIONS.map((option) => option.value)).toEqual([
    'returned',
    'sent_home',
    'referred',
  ])
})
