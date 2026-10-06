import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api, apiDownload, saveDownload } from '@/api/client'
import { parseDay } from '@/lib/format'
import type { ReportCreate, ReportSummary, SavedReport, SavedReportDetail } from '@/api/types'

export type Period = {
  /** "2026-10-01" */
  start: string
  end: string
}

export function isValidPeriod({ start, end }: Period): boolean {
  return start !== '' && end !== '' && start <= end
}

/** "Oct 1, 2026 – Oct 6, 2026" */
export function formatPeriod({ start, end }: Period): string {
  const format = (day: string) =>
    parseDay(day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${format(start)} – ${format(end)}`
}

/** Live statistics for a period, computed by the server each time. */
export function useSummary(period: Period) {
  return useQuery({
    queryKey: ['reports', 'summary', period.start, period.end],
    queryFn: ({ signal }) =>
      api<ReportSummary>('/reports/summary', {
        query: { start: period.start, end: period.end },
        signal,
      }),
    enabled: isValidPeriod(period),
  })
}

/** Reports saved by the coordinator. Each is a snapshot of the figures when it was generated. */
export function useSavedReports() {
  return useQuery({
    queryKey: ['reports', 'saved'],
    queryFn: ({ signal }) => api<SavedReport[]>('/reports', { signal }),
  })
}

export function useSavedReport(reportId: number | null) {
  return useQuery({
    queryKey: ['reports', 'saved', reportId],
    queryFn: ({ signal }) => api<SavedReportDetail>(`/reports/${reportId}`, { signal }),
    enabled: reportId !== null,
  })
}

export function useGenerateReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: ReportCreate) =>
      api<SavedReportDetail>('/reports', { method: 'POST', json: request }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['reports', 'saved'] }),
  })
}

export function useDeleteReport() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (reportId: number) => api(`/reports/${reportId}`, { method: 'DELETE' }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['reports', 'saved'] }),
  })
}

/** Downloads a CSV file from the server and hands it to the browser to save. */
export function useCsvDownload() {
  return useMutation({
    mutationFn: async (target: { path: string; query?: Record<string, string>; name: string }) => {
      saveDownload(await apiDownload(target.path, target.name, { query: target.query }))
    },
  })
}
