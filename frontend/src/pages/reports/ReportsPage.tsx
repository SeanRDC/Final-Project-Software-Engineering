import { CircleAlertIcon, DownloadIcon, SaveIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import { useCan } from '@/auth/permissions'
import { SectionCard } from '@/components/SectionCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { parseDay, toDayString } from '@/lib/format'
import { useClinicToday } from '@/lib/useClinicToday'
import { SummaryView } from '@/pages/reports/SummaryView'
import {
  formatPeriod,
  isValidPeriod,
  useCsvDownload,
  useGenerateReport,
  useSavedReports,
  useSummary,
  type Period,
} from '@/pages/reports/useReports'

const DAY = /^\d{4}-\d{2}-\d{2}$/

function presets(today: string): { label: string; period: Period }[] {
  const now = parseDay(today)
  const year = now.getFullYear()
  const month = now.getMonth()
  return [
    { label: 'This month', period: { start: toDayString(new Date(year, month, 1)), end: today } },
    {
      label: 'Last month',
      period: {
        start: toDayString(new Date(year, month - 1, 1)),
        end: toDayString(new Date(year, month, 0)),
      },
    },
    { label: 'This year', period: { start: `${year}-01-01`, end: today } },
  ]
}

function SaveReportForm({ period, onClose }: { period: Period; onClose: () => void }) {
  const navigate = useNavigate()
  const generate = useGenerateReport()
  const [title, setTitle] = useState('')
  const [isMissing, setIsMissing] = useState(false)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim()) {
      setIsMissing(true)
      document.getElementById('report-title')?.focus()
      return
    }
    generate.mutate(
      { title: title.trim(), period_start: period.start, period_end: period.end },
      {
        onSuccess: (report) => {
          toast.success(`Report “${report.title}” saved`)
          void navigate(`/reports/${report.id}`)
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Save report">
      <FieldGroup>
        <p className="text-sm text-muted-foreground">
          Period: <span className="font-medium text-foreground">{formatPeriod(period)}</span>
        </p>
        <Field data-invalid={isMissing || undefined}>
          <FieldLabel htmlFor="report-title">Title</FieldLabel>
          <Input
            id="report-title"
            name="title"
            maxLength={150}
            autoComplete="off"
            autoFocus
            placeholder="e.g. First Semester, AY 2026–2027…"
            required
            aria-invalid={isMissing || undefined}
            aria-describedby={isMissing ? 'report-title-error' : undefined}
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              setIsMissing(false)
            }}
          />
          {isMissing ? (
            <FieldError id="report-title-error">Give the report a title.</FieldError>
          ) : null}
        </Field>
        {generate.error ? (
          <p role="alert" className="text-sm text-danger">
            {generate.error instanceof ApiError
              ? generate.error.message
              : 'Something went wrong. Please try again.'}
          </p>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" disabled={generate.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={generate.isPending}>
            {generate.isPending ? <Spinner data-icon="inline-start" /> : null}
            Save report
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}

/** Clinic statistics for any period, and the reports the coordinator has saved. */
export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const today = useClinicToday()
  const allowed = useCan()
  const csv = useCsvDownload()
  const saved = useSavedReports()
  const [isSaving, setIsSaving] = useState(false)

  // The period lives in the address, so a view can be reloaded or shared.
  const defaults = presets(today)[0]!.period
  const fromParam = searchParams.get('from') ?? ''
  const toParam = searchParams.get('to') ?? ''
  const period: Period = {
    start: DAY.test(fromParam) ? fromParam : defaults.start,
    end: DAY.test(toParam) ? toParam : defaults.end,
  }
  const isValid = isValidPeriod(period)
  const { data, error, isPending } = useSummary(period)

  function setPeriod(next: Period) {
    setSearchParams({ from: next.start, to: next.end })
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <Field className="w-auto">
            <FieldLabel htmlFor="report-from">From</FieldLabel>
            <Input
              id="report-from"
              type="date"
              className="h-9 bg-card"
              max={period.end}
              value={period.start}
              onChange={(event) =>
                event.target.value && setPeriod({ ...period, start: event.target.value })
              }
            />
          </Field>
          <Field className="w-auto">
            <FieldLabel htmlFor="report-to">To</FieldLabel>
            <Input
              id="report-to"
              type="date"
              className="h-9 bg-card"
              min={period.start}
              aria-invalid={!isValid || undefined}
              value={period.end}
              onChange={(event) =>
                event.target.value && setPeriod({ ...period, end: event.target.value })
              }
            />
          </Field>
          <div className="flex flex-wrap gap-1.5">
            {presets(today).map((preset) => (
              <Button
                key={preset.label}
                variant="outline"
                className="h-9 bg-card"
                onClick={() => setPeriod(preset.period)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            className="h-9 bg-card"
            disabled={!isValid || csv.isPending}
            onClick={() =>
              csv.mutate(
                {
                  path: '/reports/summary.csv',
                  query: { start: period.start, end: period.end },
                  name: `clinic-summary-${period.start}-to-${period.end}.csv`,
                },
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
            <Button className="h-9" disabled={!isValid} onClick={() => setIsSaving(true)}>
              <SaveIcon data-icon="inline-start" />
              Save as report
            </Button>
          ) : null}
        </div>
      </div>

      {!isValid ? (
        <p role="alert" className="text-sm text-danger">
          The “To” date is before the “From” date.
        </p>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The statistics could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isValid && isPending ? (
        <div role="status" aria-label="Loading statistics" className="flex flex-col gap-4">
          <Skeleton className="h-24 rounded-lg" />
          <Skeleton className="h-64 rounded-lg" />
        </div>
      ) : null}

      {isValid && data ? <SummaryView summary={data} /> : null}

      <SectionCard title="Saved reports">
        {saved.isPending ? (
          <div role="status" aria-label="Loading saved reports" className="p-4">
            <Skeleton className="h-10" />
          </div>
        ) : null}
        {saved.error ? (
          <p role="alert" className="px-4 py-4 text-sm text-danger">
            {saved.error instanceof ApiError
              ? saved.error.message
              : 'The saved reports could not be loaded.'}
          </p>
        ) : null}
        {saved.data && saved.data.length === 0 ? (
          <p className="px-4 py-4 text-sm text-muted-foreground">
            No report has been saved yet. A saved report keeps the figures as they were when it was
            generated.
          </p>
        ) : null}
        {saved.data && saved.data.length > 0 ? (
          <ul className="divide-y">
            {saved.data.map((report) => (
              <li
                key={report.id}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <Link
                    to={`/reports/${report.id}`}
                    className="rounded-sm text-[15px] font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {report.title}
                  </Link>
                  <p className="text-sm text-muted-foreground">
                    {formatPeriod({ start: report.period_start, end: report.period_end })}
                    {report.generated_by_name ? ` · saved by ${report.generated_by_name}` : ''}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : null}
      </SectionCard>

      <Dialog open={isSaving} onOpenChange={setIsSaving}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save as report</DialogTitle>
            <DialogDescription>
              The figures are stored as they are now, so a submitted report does not change later.
            </DialogDescription>
          </DialogHeader>
          {isSaving ? <SaveReportForm period={period} onClose={() => setIsSaving(false)} /> : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
