import { expect, test } from 'vitest'

import { pageFor } from '@/layout/pages'

test('finds a page by its exact address', () => {
  expect(pageFor('/')?.title).toBe('Clinic Main Menu')
  expect(pageFor('/inventory')?.title).toBe('Medicine Inventory')
})

test('matches a record address to the most specific page', () => {
  expect(pageFor('/patients/12')?.title).toBe('Patients')
  expect(pageFor('/inventory/releases/4')?.title).toBe('Medicine Release Log')
})

test('returns nothing for an unknown address', () => {
  expect(pageFor('/nowhere')).toBeUndefined()
})
