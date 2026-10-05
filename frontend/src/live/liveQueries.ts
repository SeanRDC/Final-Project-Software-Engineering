// Which cached data a live event makes out of date.
// Query keys start with the name of what they hold: ['dashboard'], ['visits', id], ...

const QUERIES_BY_EVENT: Record<string, readonly string[]> = {
  'visits.updated': ['dashboard', 'visits', 'patients'],
  'appointments.updated': ['dashboard', 'appointments'],
  'inventory.updated': ['dashboard', 'inventory'],
  'notifications.updated': ['dashboard', 'notifications'],
  'lock.updated': ['locks'],
}

/** The first element of every query key that should be refetched after this event. */
export function staleQueriesFor(event: string): readonly string[] {
  return QUERIES_BY_EVENT[event] ?? []
}
