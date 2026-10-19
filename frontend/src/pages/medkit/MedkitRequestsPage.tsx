// The list of medical kit requests: what is waiting, out, overdue or back.

import { BriefcaseMedicalIcon, CircleAlertIcon, PlusIcon } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'

import { ApiError } from '@/api/client'
import { useCan } from '@/auth/permissions'
import { Pager } from '@/components/Pager'
import { StatusPill } from '@/components/StatusPill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { cn } from '@/lib/utils'
import { formatShortDay, requestState } from '@/pages/medkit/medkitDisplay'
import { REQUESTS_PER_PAGE, useMedkitRequests, type RequestFilter } from '@/pages/medkit/useMedkits'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

const FILTERS: { value: RequestFilter | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'requested', label: 'Requested' },
  { value: 'issued', label: 'Out' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'returned', label: 'Returned' },
  { value: 'lost', label: 'Lost' },
  { value: 'cancelled', label: 'Cancelled' },
]

function parseFilter(value: string | null): RequestFilter {
  return FILTERS.some((filter) => filter.value === value && value !== 'all')
    ? (value as RequestFilter)
    : ''
}

/** Kit requests, newest first, filtered by where each loan stands. */
export function MedkitRequestsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const allowed = useCan()
  const filter = parseFilter(searchParams.get('show'))
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const { data, error, isPending, isPlaceholderData } = useMedkitRequests({ filter, page })

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    if (!('page' in changes)) next.delete('page')
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Show requests"
          className="flex-wrap"
          value={filter || 'all'}
          onValueChange={(next) => next && update({ show: next === 'all' ? null : next })}
        >
          {FILTERS.map((option) => (
            <ToggleGroupItem key={option.value} value={option.value} className="bg-card px-3">
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        {allowed('medkits:write') ? (
          <Button asChild size="lg" className="h-10 px-4">
            <Link to="/medkit/new">
              <PlusIcon data-icon="inline-start" />
              New request
            </Link>
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The kit requests could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div role="status" aria-label="Loading kit requests" className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : null}

      {data ? (
        <section
          aria-label="Medical kit requests"
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
                  <BriefcaseMedicalIcon />
                </EmptyMedia>
                <EmptyTitle>
                  {filter ? 'No request in this list' : 'No kit requests yet'}
                </EmptyTitle>
                <EmptyDescription>
                  {filter
                    ? 'Choose All to see every request.'
                    : 'File a request when an organization asks to borrow a medical kit.'}
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={cn(HEAD_CLASS, 'pl-4')}>Activity</TableHead>
                      <TableHead className={HEAD_CLASS}>Date</TableHead>
                      <TableHead className={HEAD_CLASS}>Kit</TableHead>
                      <TableHead className={HEAD_CLASS}>Person responsible</TableHead>
                      <TableHead className={cn(HEAD_CLASS, 'pr-4')}>State</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((request) => {
                      const state = requestState(request)
                      return (
                        <TableRow key={request.id} className="relative">
                          <TableCell className="py-3 pl-4 whitespace-normal">
                            <Link
                              to={`/medkit/requests/${request.id}`}
                              className="rounded-sm text-[15px] font-medium outline-none after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {request.activity}
                            </Link>
                            <div className="text-[13px] text-muted-foreground">
                              {request.organization}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-sm whitespace-nowrap tabular-nums">
                            {formatShortDay(request.activity_date)}
                          </TableCell>
                          <TableCell className="py-3 text-sm whitespace-nowrap">
                            {request.medkit ? `Kit #${request.medkit.kit_number}` : '—'}
                          </TableCell>
                          <TableCell className="py-3 text-sm">
                            {request.person_responsible}
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            <StatusPill tone={state.tone}>{state.label}</StatusPill>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
              <Pager
                page={page}
                pageSize={REQUESTS_PER_PAGE}
                total={data.total}
                noun="requests"
                onPageChange={(next) => update({ page: next > 1 ? String(next) : null })}
              />
            </>
          )}
        </section>
      ) : null}
    </div>
  )
}
