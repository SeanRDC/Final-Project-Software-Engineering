import { ArrowLeftIcon, DownloadIcon, Trash2Icon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import { useCan } from '@/auth/permissions'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { formatTimeOfDay } from '@/lib/format'
import { SummaryView } from '@/pages/reports/SummaryView'
import {
  formatPeriod,
  useCsvDownload,
  useDeleteReport,
  useSavedReport,
} from '@/pages/reports/useReports'

/** A saved report at /reports/:reportId: the figures as they were when it was generated. */
export function SavedReportPage() {
  const params = useParams()
  const navigate = useNavigate()
  const allowed = useCan()
  const reportId = /^\d+$/.test(params.reportId ?? '') ? Number(params.reportId) : null
  const { data: report, error, isPending } = useSavedReport(reportId)
  const csv = useCsvDownload()
  const remove = useDeleteReport()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const back = (
    <Button asChild variant="outline" className="bg-card">
      <Link to="/reports">
        <ArrowLeftIcon data-icon="inline-start" />
        All reports
      </Link>
    </Button>
  )

  if (reportId === null || (error instanceof ApiError && error.status === 404)) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-[15px]">There is no saved report at this address.</p>
        {back}
      </div>
    )
  }

  if (isPending) {
    return (
      <div role="status" aria-label="Loading the report" className="flex flex-col gap-4">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    )
  }

  if (!report) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error instanceof ApiError ? error.message : 'The report could not be loaded.'}
      </p>
    )
  }

  const savedOn = `${new Date(report.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}, ${formatTimeOfDay(report.created_at)}`

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold">{report.title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {formatPeriod({ start: report.period_start, end: report.period_end })}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Saved {savedOn}
            {report.generated_by_name ? ` by ${report.generated_by_name}` : ''}. The figures are as
            they were then.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {back}
          <Button
            variant="outline"
            className="bg-card"
            disabled={csv.isPending}
            onClick={() =>
              csv.mutate(
                { path: `/reports/${report.id}/csv`, name: `clinic-report-${report.id}.csv` },
                {
                  onError: (failure) =>
                    toast.error('The CSV could not be downloaded', {
                      description:
                        failure instanceof ApiError ? failure.message : 'Please try again.',
                    }),
                },
              )
            }
          >
            {csv.isPending ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <DownloadIcon data-icon="inline-start" />
            )}
            Download CSV
          </Button>
          {allowed('reports:generate') ? (
            <AlertDialog
              open={isDeleteOpen}
              onOpenChange={(open) => {
                setIsDeleteOpen(open)
                if (!open) remove.reset()
              }}
            >
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="bg-card text-destructive">
                  <Trash2Icon data-icon="inline-start" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this report?</AlertDialogTitle>
                  <AlertDialogDescription>
                    “{report.title}” will be removed for good. The visits and records it was built
                    from are not affected, but this snapshot of the figures cannot be recovered.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {remove.error ? (
                  <p role="alert" className="text-sm text-danger">
                    {remove.error instanceof ApiError
                      ? remove.error.message
                      : 'The report could not be deleted. Please try again.'}
                  </p>
                ) : null}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={remove.isPending}>Keep report</AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={remove.isPending}
                    onClick={() =>
                      remove.mutate(report.id, {
                        onSuccess: () => {
                          toast.success(`Report “${report.title}” deleted`)
                          void navigate('/reports')
                        },
                      })
                    }
                  >
                    {remove.isPending ? <Spinner data-icon="inline-start" /> : null}
                    Delete report
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ) : null}
        </div>
      </header>

      <SummaryView summary={report.summary} />
    </div>
  )
}
