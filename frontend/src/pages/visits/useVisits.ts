import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api/client'
import type {
  ConsultationUpdate,
  DispenseRequest,
  Medicine,
  Visit,
  VisitDisposition,
  VisitRecordUpdate,
  VisitSummary,
} from '@/api/types'
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

/** The medicines that can be released: everything active in the inventory. */
export function useMedicines(enabled: boolean) {
  return useQuery({
    queryKey: ['inventory', 'medicines'],
    queryFn: ({ signal }) => api<Medicine[]>('/inventory/medicines', { signal }),
    enabled,
  })
}

/**
 * A change to one visit. Every route answers with the full updated visit, which goes
 * straight into the cache; the lists named by `events` are then refetched. The server
 * sends the same events over the WebSocket, but a station whose connection has dropped
 * must still see its own change.
 */
function useVisitMutation<Input>(
  visitId: number,
  send: (input: Input) => Promise<Visit>,
  events: string[] = ['visits.updated'],
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: send,
    onSuccess: (visit) => {
      queryClient.setQueryData(['visits', visitId], visit)
      const stale = new Set(events.flatMap((event) => staleQueriesFor(event)))
      for (const key of stale) {
        void queryClient.invalidateQueries({
          queryKey: [key],
          // The visit itself was just written from the response.
          predicate: (query) => !(query.queryKey[0] === 'visits' && query.queryKey[1] === visitId),
        })
      }
    },
  })
}

/** Cancels an open visit, e.g. a patient checked in by mistake. */
export function useCancelVisit(visitId: number) {
  return useVisitMutation(
    visitId,
    (reason: string) =>
      api<Visit>(`/visits/${visitId}/cancel`, {
        method: 'POST',
        json: { reason: reason.trim() || null },
      }),
    ['visits.updated', 'appointments.updated'],
  )
}

/** Saves the nurse's record: complaint, vital signs, assessment, treatment and outcome. */
export function useUpdateRecord(visitId: number) {
  return useVisitMutation(visitId, (changes: VisitRecordUpdate) =>
    api<Visit>(`/visits/${visitId}`, { method: 'PATCH', json: changes }),
  )
}

/** Saves the doctor's consultation notes, diagnosis and medication details. */
export function useUpdateConsultation(visitId: number) {
  return useVisitMutation(visitId, (changes: ConsultationUpdate) =>
    api<Visit>(`/visits/${visitId}/consultation`, { method: 'PATCH', json: changes }),
  )
}

/** Finishes the visit, which commits it to the patient's history. */
export function useCompleteVisit(visitId: number) {
  return useVisitMutation(
    visitId,
    (disposition: VisitDisposition | null) =>
      api<Visit>(`/visits/${visitId}/complete`, { method: 'POST', json: { disposition } }),
    ['visits.updated', 'appointments.updated'],
  )
}

/** Releases medicine to the patient; the server deducts it from stock. */
export function useDispense(visitId: number) {
  return useVisitMutation(
    visitId,
    (request: DispenseRequest) =>
      api<Visit>(`/visits/${visitId}/medicines`, { method: 'POST', json: request }),
    ['inventory.updated', 'notifications.updated'],
  )
}

/** Removes a wrongly recorded release; the server returns the stock. */
export function useUndoDispense(visitId: number) {
  return useVisitMutation(
    visitId,
    (entryId: number) =>
      api<Visit>(`/visits/${visitId}/medicines/${entryId}`, { method: 'DELETE' }),
    ['inventory.updated'],
  )
}
