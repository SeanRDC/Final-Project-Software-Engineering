import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { CircleAlertIcon, ScrollTextIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import { api, ApiError } from '@/api/client'
import type { AuditEntry, AuditPage } from '@/api/types'
import { Pager } from '@/components/Pager'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTimeOfDay, humanize } from '@/lib/format'
import { cn } from '@/lib/utils'
import { describeDetail } from '@/pages/audit/auditDetail'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'
const DAY = /^\d{4}-\d{2}-\d{2}$/
const PER_PAGE = 50

/** The kinds of record the server writes audit entries about. */
const RECORD_TYPES = ['patient', 'visit', 'appointment', 'medicine', 'attachment', 'report', 'user']

/** "patient.view" -> "Viewed patient"; anything unexpected is shown as the server wrote it. */
function describeAction(action: string): string {
  const [entity, verb] = action.split('.')
  if (!entity || !verb) return humanize(action)
  return `${humanize(entity)}: ${verb.replaceAll('_', ' ')}`
}

/** Where an entry's record can be opened, for the kinds that have a screen. */
function recordLink(entry: AuditEntry): string | null {
  if (entry.entity_id === null) return null
  if (entry.entity_type === 'patient') return `/patients/${entry.entity_id}`
  if (entry.entity_type === 'visit') return `/visits/${entry.entity_id}`
  if (entry.entity_type === 'report') return `/reports/${entry.entity_id}`
  return null
}

function when(moment: string): string {
  const date = new Date(moment).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${date}, ${formatTimeOfDay(moment)}`
}

/** A local calendar day as the instant it starts or ends, for the server's time filter. */
function dayBoundary(day: string, edge: 'start' | 'end'): string {
  return new Date(`${day}T${edge === 'start' ? '00:00:00.000' : '23:59:59.999'}`).toISOString()
}

function ActionFilter({ value, onApply }: { value: string; onApply: (value: string) => void }) {
  const [text, setText] = useState(value)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onApply(text.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <Field className="w-44">
        <FieldLabel htmlFor="audit-action">Action</FieldLabel>
        <Input
          id="audit-action"
          name="action"
          className="h-9 bg-card"
          autoComplete="off"
          spellCheck={false}
          placeholder="e.g. patient.view…"
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
      </Field>
      <Button type="submit" variant="outline" className="h-9 bg-card">
        Apply
      </Button>
    </form>
  )
}

/** Who viewed or changed which record, and when. For the coordinator. */
export function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams()

  // The filters live in the address, so a filtered log can be reloaded or shared.
  const recordType = RECORD_TYPES.includes(searchParams.get('record') ?? '')
    ? searchParams.get('record')!
    : ''
  const action = searchParams.get('action') ?? ''
  const from = DAY.test(searchParams.get('from') ?? '') ? searchParams.get('from')! : ''
  const to = DAY.test(searchParams.get('to') ?? '') ? searchParams.get('to')! : ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const { data, error, isPending, isPlaceholderData } = useQuery({
    queryKey: ['audit', recordType, action, from, to, page],
    queryFn: ({ signal }) =>
      api<AuditPage>('/audit-logs', {
        query: {
          entity_type: recordType,
          action,
          start: from ? dayBoundary(from, 'start') : '',
          end: to ? dayBoundary(to, 'end') : '',
          page,
          page_size: PER_PAGE,
        },
        signal,
      }),
    placeholderData: keepPreviousData,
  })

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    // Any change to the filters starts again from the first page.
    if (!('page' in changes)) next.delete('page')
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next)
  }

  const isFiltered = Boolean(recordType || action || from || to)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field className="w-44">
          <FieldLabel htmlFor="audit-record">Kind of record</FieldLabel>
          <NativeSelect
            id="audit-record"
            className="h-9 bg-card"
            value={recordType}
            onChange={(event) => update({ record: event.target.value || null })}
          >
            <NativeSelectOption value="">All records</NativeSelectOption>
            {RECORD_TYPES.map((type) => (
              <NativeSelectOption key={type} value={type}>
                {humanize(type)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <ActionFilter
          key={action}
          value={action}
          onApply={(value) => update({ action: value || null })}
        />
        <Field className="w-auto">
          <FieldLabel htmlFor="audit-from">From</FieldLabel>
          <Input
            id="audit-from"
            type="date"
            className="h-9 bg-card"
            max={to || undefined}
            value={from}
            onChange={(event) => update({ from: event.target.value || null })}
          />
        </Field>
        <Field className="w-auto">
          <FieldLabel htmlFor="audit-to">To</FieldLabel>
          <Input
            id="audit-to"
            type="date"
            className="h-9 bg-card"
            min={from || undefined}
            value={to}
            onChange={(event) => update({ to: event.target.value || null })}
          />
        </Field>
        {isFiltered ? (
          <Button variant="ghost" className="h-9" onClick={() => setSearchParams({})}>
            Clear filters
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The audit log could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div role="status" aria-label="Loading the audit log" className="flex flex-col gap-2">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : null}

      {data ? (
        <section
          aria-label="Audit entries"
          aria-busy={isPlaceholderData}
          className={cn(
            'overflow-hidden rounded-lg border bg-card transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
        >
          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ScrollTextIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {isFiltered ? 'No entry matches' : 'The audit log is empty'}
                </EmptyTitle>
                <EmptyDescription>
                  {isFiltered
                    ? 'An action has to be typed exactly as it is recorded, e.g. patient.view.'
                    : 'Every view and change of a record is listed here.'}
                </EmptyDescription>
              </EmptyHeader>
              {isFiltered ? (
                <EmptyContent>
                  <Button variant="outline" onClick={() => setSearchParams({})}>
                    Clear filters
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(HEAD_CLASS, 'pl-4')}>When</TableHead>
                    <TableHead className={HEAD_CLASS}>Account</TableHead>
                    <TableHead className={HEAD_CLASS}>Action</TableHead>
                    <TableHead className={HEAD_CLASS}>Record</TableHead>
                    <TableHead className={cn(HEAD_CLASS, 'pr-4')}>Detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((entry) => {
                    const link = recordLink(entry)
                    const record = entry.entity_type
                      ? `${humanize(entry.entity_type)}${entry.entity_id === null ? '' : ` #${entry.entity_id}`}`
                      : null
                    return (
                      <TableRow key={entry.id}>
                        <TableCell className="py-2.5 pl-4 text-sm whitespace-nowrap tabular-nums">
                          {when(entry.created_at)}
                        </TableCell>
                        <TableCell className="py-2.5 text-sm">
                          {entry.username ?? <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell className="py-2.5 text-sm">
                          <span title={entry.action}>{describeAction(entry.action)}</span>
                        </TableCell>
                        <TableCell className="py-2.5 text-sm whitespace-nowrap">
                          {record === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : link ? (
                            <Link
                              to={link}
                              className="rounded-sm font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {record}
                            </Link>
                          ) : (
                            record
                          )}
                        </TableCell>
                        <TableCell className="max-w-96 py-2.5 pr-4 text-[13px] break-words whitespace-normal text-muted-foreground">
                          {describeDetail(entry.detail)}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
              <Pager
                page={page}
                pageSize={PER_PAGE}
                total={data.total}
                noun="entries"
                onPageChange={(next) => update({ page: next > 1 ? String(next) : null })}
              />
            </>
          )}
        </section>
      ) : null}
    </div>
  )
}
