import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api/client'
import type {
  Options,
  Patient,
  PatientCreate,
  PatientPage,
  PatientRecord,
  PatientType,
  PatientUpdate,
  VisitPage,
} from '@/api/types'

export const PATIENTS_PER_PAGE = 20
export const VISITS_PER_PAGE = 10

export type PatientListParams = {
  q: string
  patientType: PatientType | ''
  includeArchived: boolean
  page: number
}

/** One page of the patient list, searched and filtered by the server. */
export function usePatientList(params: PatientListParams) {
  return useQuery({
    queryKey: ['patients', 'list', params],
    queryFn: ({ signal }) =>
      api<PatientPage>('/patients', {
        query: {
          q: params.q,
          patient_type: params.patientType,
          include_archived: params.includeArchived || undefined,
          page: params.page,
          page_size: PATIENTS_PER_PAGE,
        },
        signal,
      }),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  })
}

/** One patient record. The server writes an audit entry each time it is read. */
export function usePatient(patientId: number | null) {
  return useQuery({
    queryKey: ['patients', patientId],
    queryFn: ({ signal }) => api<Patient>(`/patients/${patientId}`, { signal }),
    enabled: patientId !== null,
  })
}

/** A patient's visits, newest first. */
export function usePatientVisits(patientId: number, page: number, enabled: boolean) {
  return useQuery({
    queryKey: ['patients', patientId, 'visits', page],
    queryFn: ({ signal }) =>
      api<VisitPage>(`/patients/${patientId}/visits`, {
        query: { page, page_size: VISITS_PER_PAGE },
        signal,
      }),
    enabled,
    placeholderData: keepPreviousData,
  })
}

/** Departments already used in patient records, offered as suggestions in the form. */
export function useDepartments() {
  return useQuery({
    queryKey: ['options'],
    queryFn: ({ signal }) => api<Options>('/options', { signal }),
    staleTime: 5 * 60_000,
    select: (options) => options.departments,
  })
}

export function useRegisterPatient() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: PatientCreate) =>
      api<PatientRecord>('/patients', { method: 'POST', json: request }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      void queryClient.invalidateQueries({ queryKey: ['options'] })
    },
  })
}

/** A change to one patient record: a correction, or archiving and restoring it. */
function usePatientMutation<Input>(send: (input: Input) => Promise<PatientRecord>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: send,
    onSuccess: () => {
      // The answer lacks the visit count the record page shows, so refetch instead of caching it.
      void queryClient.invalidateQueries({ queryKey: ['patients'] })
      void queryClient.invalidateQueries({ queryKey: ['options'] })
    },
  })
}

export function useUpdatePatient(patientId: number) {
  return usePatientMutation((changes: PatientUpdate) =>
    api<PatientRecord>(`/patients/${patientId}`, { method: 'PATCH', json: changes }),
  )
}

/** Archives a record (hides it from search) or restores it. Nothing is ever deleted. */
export function useSetArchived(patientId: number) {
  return usePatientMutation((archived: boolean) =>
    api<PatientRecord>(`/patients/${patientId}/${archived ? 'archive' : 'restore'}`, {
      method: 'POST',
    }),
  )
}
