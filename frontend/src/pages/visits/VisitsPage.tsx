import { CircleAlertIcon, ClipboardListIcon, ClipboardPlusIcon, RefreshCwIcon } from 'lucide-react'
import { Link, Outlet, useSearchParams } from 'react-router'

import { ApiError } from '@/api/client'
import { useCan } from '@/auth/permissions'
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
import { Skeleton } from '@/components/ui/skeleton'
import { useNow } from '@/lib/useNow'
import { useTodaysVisits } from '@/pages/visits/useVisits'
import { applyFilter, parseFilter, type VisitFilter } from '@/pages/visits/filter'
import { VisitsFilter } from '@/pages/visits/VisitsFilter'
import { VisitsTable } from '@/pages/visits/VisitsTable'

const EMPTY_TEXT: Record<VisitFilter, { title: string; description: string }> = {
  all: {
    title: 'No visits yet today',
    description: 'Patients appear here as soon as they are checked in at the front desk.',
  },
  open: {
    title: 'No open visits',
    description: 'Every visit checked in today has been completed.',
  },
  completed: {
    title: 'No completed visits yet',
    description: 'Visits move here once the nurse or the doctor completes them.',
  },
}

/** Today's visit log. A visit opened from it is shown in a panel over the list. */
export function VisitsPage() {
  const { data, error, isPending, isFetching, refetch } = useTodaysVisits()
  const [searchParams, setSearchParams] = useSearchParams()
  const now = useNow()
  const allowed = useCan()

  // The filter lives in the address, so it survives a reload and can be shared.
  const filter = parseFilter(searchParams.get('status'))
  const search = searchParams.toString()
  const visits = data ?? []
  const shown = applyFilter(visits, filter)

  function changeFilter(next: VisitFilter) {
    setSearchParams(next === 'all' ? {} : { status: next }, { replace: true })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <VisitsFilter visits={visits} value={filter} onChange={changeFilter} />
        {allowed('visits:record') ? (
          <Button asChild size="lg" className="h-10 px-4">
            <Link to="/check-in">
              <ClipboardPlusIcon data-icon="inline-start" />
              Check in patient
            </Link>
          </Button>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>
            {data ? 'The visit log could not be refreshed' : 'The visit log could not be loaded'}
          </AlertTitle>
          <AlertDescription>
            <p>{error instanceof ApiError ? error.message : 'Something went wrong.'}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 bg-card text-foreground"
              disabled={isFetching}
              onClick={() => void refetch()}
            >
              <RefreshCwIcon data-icon="inline-start" />
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div role="status" aria-label="Loading today's visits" className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : null}

      {data ? (
        <section aria-label="Visit log" className="overflow-hidden rounded-lg border bg-card">
          {shown.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <ClipboardListIcon />
                </EmptyMedia>
                <EmptyTitle>{EMPTY_TEXT[filter].title}</EmptyTitle>
                <EmptyDescription>{EMPTY_TEXT[filter].description}</EmptyDescription>
              </EmptyHeader>
              {filter !== 'all' ? (
                <EmptyContent>
                  <Button variant="outline" onClick={() => changeFilter('all')}>
                    Show all visits
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <VisitsTable
              visits={shown}
              now={now}
              hrefFor={(visit) => `/visits/${visit.id}${search ? `?${search}` : ''}`}
            />
          )}
        </section>
      ) : null}

      {/* /visits/:visitId renders the visit panel here. */}
      <Outlet />
    </div>
  )
}
