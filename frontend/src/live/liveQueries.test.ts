import { expect, test } from 'vitest'

import { staleQueriesFor } from '@/live/liveQueries'

test('a visit change refreshes the dashboard, the visit lists and patient histories', () => {
  expect(staleQueriesFor('visits.updated')).toEqual(['dashboard', 'visits', 'patients'])
})

test('every change the dashboard shows refreshes the dashboard', () => {
  for (const event of [
    'visits.updated',
    'appointments.updated',
    'inventory.updated',
    'notifications.updated',
  ]) {
    expect(staleQueriesFor(event)).toContain('dashboard')
  }
})

test('an unknown event refreshes nothing', () => {
  expect(staleQueriesFor('something.else')).toEqual([])
})

test('a medical kit change refreshes the kits and their requests', () => {
  expect(staleQueriesFor('medkits.updated')).toEqual(['medkits', 'medkit-requests'])
  // The kit contents show what is on hand, so a stock change refreshes them too.
  expect(staleQueriesFor('inventory.updated')).toContain('medkits')
})
