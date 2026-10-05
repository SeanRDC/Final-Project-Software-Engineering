import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { PatientPage } from '@/api/types'
import { useDebouncedValue } from '@/lib/useDebouncedValue'

/** Typing fewer characters than this would match most of the clinic's records. */
export const MIN_SEARCH_LENGTH = 2
const RESULT_LIMIT = 8

/** Searches active patient records by name, ID number or department as the term is typed. */
export function usePatientSearch(term: string) {
  const query = useDebouncedValue(term.trim())
  const isLongEnough = query.length >= MIN_SEARCH_LENGTH

  const result = useQuery({
    queryKey: ['patients', 'search', query],
    queryFn: ({ signal }) =>
      api<PatientPage>('/patients', { query: { q: query, page_size: RESULT_LIMIT }, signal }),
    enabled: isLongEnough,
    // Keep the previous matches on screen while the next ones load, so the list does not flicker.
    placeholderData: keepPreviousData,
  })

  return {
    patients: isLongEnough ? (result.data?.items ?? []) : [],
    total: isLongEnough ? (result.data?.total ?? 0) : 0,
    /** True once a search for the current term has an answer. */
    hasSearched: isLongEnough && result.isSuccess && !result.isPlaceholderData,
    isSearching: isLongEnough && result.isFetching,
    error: isLongEnough ? result.error : null,
  }
}
