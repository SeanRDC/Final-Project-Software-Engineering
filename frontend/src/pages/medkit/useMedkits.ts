// Data for the medical kit screens: the kits, their standard contents and each loan.

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api/client'
import type {
  KitContentsLine,
  KitContentsLineIn,
  Medkit,
  MedkitCreate,
  MedkitIssue,
  MedkitRequest,
  MedkitRequestCreate,
  MedkitRequestPage,
  MedkitRequestStatus,
  MedkitReturn,
  MedkitUpdate,
} from '@/api/types'

export const REQUESTS_PER_PAGE = 20

/** The tabs of the request list; "overdue" is a filter of its own on the server. */
export type RequestFilter = MedkitRequestStatus | 'overdue' | ''

/** Every kit with the loan it is out on. */
export function useKits() {
  return useQuery({
    queryKey: ['medkits', 'kits'],
    queryFn: ({ signal }) => api<Medkit[]>('/medkits', { signal }),
  })
}

/** What a kit normally carries, in the order of the dispensary form. */
export function useKitContents() {
  return useQuery({
    queryKey: ['medkits', 'template'],
    queryFn: ({ signal }) => api<KitContentsLine[]>('/medkits/template', { signal }),
  })
}

export function useMedkitRequests(params: { filter: RequestFilter; page: number }) {
  return useQuery({
    queryKey: ['medkit-requests', 'list', params],
    queryFn: ({ signal }) =>
      api<MedkitRequestPage>('/medkit-requests', {
        query: {
          status: params.filter === 'overdue' ? '' : params.filter,
          overdue_only: params.filter === 'overdue' || undefined,
          page: params.page,
          page_size: REQUESTS_PER_PAGE,
        },
        signal,
      }),
    placeholderData: keepPreviousData,
  })
}

export function useMedkitRequest(requestId: number | null) {
  return useQuery({
    queryKey: ['medkit-requests', requestId],
    queryFn: ({ signal }) => api<MedkitRequest>(`/medkit-requests/${requestId}`, { signal }),
    enabled: requestId !== null,
  })
}

/** A change to kits or loans. Stock may have moved too, so the inventory is refreshed. */
function useMedkitMutation<Input, Output>(send: (input: Input) => Promise<Output>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: send,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['medkits'] })
      void queryClient.invalidateQueries({ queryKey: ['medkit-requests'] })
      void queryClient.invalidateQueries({ queryKey: ['inventory'] })
    },
  })
}

export function useCreateMedkitRequest() {
  return useMedkitMutation((request: MedkitRequestCreate) =>
    api<MedkitRequest>('/medkit-requests', { method: 'POST', json: request }),
  )
}

export function useIssueKit(requestId: number) {
  return useMedkitMutation((issue: MedkitIssue) =>
    api<MedkitRequest>(`/medkit-requests/${requestId}/issue`, { method: 'POST', json: issue }),
  )
}

export function useReturnKit(requestId: number) {
  return useMedkitMutation((counted: MedkitReturn) =>
    api<MedkitRequest>(`/medkit-requests/${requestId}/return`, { method: 'POST', json: counted }),
  )
}

export function useMarkKitLost(requestId: number) {
  return useMedkitMutation((notes: string) =>
    api<MedkitRequest>(`/medkit-requests/${requestId}/lost`, {
      method: 'POST',
      json: { notes: notes.trim() || null },
    }),
  )
}

export function useCancelMedkitRequest(requestId: number) {
  return useMedkitMutation(() =>
    api<MedkitRequest>(`/medkit-requests/${requestId}/cancel`, { method: 'POST' }),
  )
}

export function useAddKit() {
  return useMedkitMutation((kit: MedkitCreate) =>
    api<Medkit>('/medkits', { method: 'POST', json: kit }),
  )
}

export function useUpdateKit(kitId: number) {
  return useMedkitMutation((changes: MedkitUpdate) =>
    api<Medkit>(`/medkits/${kitId}`, { method: 'PATCH', json: changes }),
  )
}

export function useSaveKitContents() {
  return useMedkitMutation((lines: KitContentsLineIn[]) =>
    api<KitContentsLine[]>('/medkits/template', { method: 'PUT', json: lines }),
  )
}
