import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api/client'
import type { Visit, VisitSummary } from '@/api/types'
import { staleQueriesFor } from '@/live/liveQueries'

/** Today's visit log: open visits in order of arrival, then completed ones. */
export function useTodaysVisits() {
  return useQuery({
    queryKey: ['visits', 'today'],
    queryFn: ({ signal }) => api<VisitSummary[]>('/visits/today', { signal }),
  })
}

/** One full visit record. The server writes an audit entry each time it is read. */
export function useVisit(visitId: number | null) {
  return useQuery({
    queryKey: ['visits', visitId],
    queryFn: ({ signal }) => api<Visit>(`/visits/${visitId}`, { signal }),
    enabled: visitId !== null,
  })
}

/** Cancels an open visit, e.g. a patient checked in by mistake. */
export function useCancelVisit(visitId: number) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reason: string) =>
      api<Visit>(`/visits/${visitId}/cancel`, {
        method: 'POST',
        json: { reason: reason.trim() || null },
      }),
    onSuccess: (visit) => {
      queryClient.setQueryData(['visits', visitId], visit)
      for (const event of ['visits.updated', 'appointments.updated']) {
        for (const key of staleQueriesFor(event)) {
          void queryClient.invalidateQueries({ queryKey: [key] })
        }
      }
    },
  })
}
