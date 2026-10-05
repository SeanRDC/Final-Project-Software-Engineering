import type { VisitSummary } from '@/api/types'

export type VisitFilter = 'all' | 'open' | 'completed'

/** Reads the filter from the address; anything unknown means "all". */
export function parseFilter(value: string | null): VisitFilter {
  return value === 'open' || value === 'completed' ? value : 'all'
}

export function applyFilter(visits: VisitSummary[], filter: VisitFilter): VisitSummary[] {
  return filter === 'all' ? visits : visits.filter((visit) => visit.status === filter)
}
