import { useNavigate, useParams, useSearchParams } from 'react-router'

import { ApiError } from '@/api/client'
import { useCan } from '@/auth/permissions'
import { StatusPill } from '@/components/StatusPill'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDuration, formatTimeOfDay, humanize } from '@/lib/format'
import { useNow } from '@/lib/useNow'
import { describePatient, visitState } from '@/lib/visitState'
import { CancelVisitDialog } from '@/pages/visits/CancelVisitDialog'
import { useVisit } from '@/pages/visits/useVisits'
import { VisitRecord } from '@/pages/visits/VisitRecord'

/** The visit at /visits/:visitId, shown in a panel over the visit log. */
export function VisitPanel() {
  const params = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const now = useNow()
  const allowed = useCan()

  const visitId = /^\d+$/.test(params.visitId ?? '') ? Number(params.visitId) : null
  const { data: visit, error, isPending } = useVisit(visitId)
  const state = visit ? visitState(visit, now) : null

  function close() {
    const search = searchParams.toString()
    void navigate(`/visits${search ? `?${search}` : ''}`)
  }

  const notFound = visitId === null || (error instanceof ApiError && error.status === 404)

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent className="w-full gap-0 overscroll-contain sm:max-w-xl">
        <SheetHeader className="border-b pr-12">
          <SheetTitle className="flex flex-wrap items-center gap-2 text-lg">
            {visit ? visit.patient.full_name : notFound ? 'Visit not found' : 'Visit'}
            {state ? <StatusPill tone={state.tone}>{state.label}</StatusPill> : null}
          </SheetTitle>
          <SheetDescription>
            {visit && state ? (
              <>
                <span className="tabular-nums">{visit.patient.id_number}</span> ·{' '}
                {describePatient(visit.patient)}
                {visit.patient.department ? ` · ${visit.patient.department}` : ''}
                <br />
                {humanize(visit.visit_type)} · checked in {formatTimeOfDay(visit.checked_in_at)}
                {visit.status === 'cancelled'
                  ? ''
                  : ` · ${state.timeLabel.toLowerCase()} ${formatDuration(state.minutes)}`}
              </>
            ) : notFound ? (
              'There is no visit with this number.'
            ) : (
              'Loading the visit record…'
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4">
          {visitId !== null && isPending ? (
            <div role="status" aria-label="Loading the visit" className="flex flex-col gap-3">
              <Skeleton className="h-20" />
              <Skeleton className="h-28" />
              <Skeleton className="h-28" />
            </div>
          ) : null}

          {error && !notFound ? (
            <p role="alert" className="text-sm text-danger">
              {error instanceof ApiError ? error.message : 'The visit could not be loaded.'}
            </p>
          ) : null}

          {visit ? <VisitRecord visit={visit} /> : null}
        </div>

        {visit && visit.status === 'open' && allowed('visits:record') ? (
          <SheetFooter className="flex-row items-center justify-between border-t">
            <p className="text-[13px] text-muted-foreground">
              Recording vital signs and notes is the next screen to be built.
            </p>
            <CancelVisitDialog visit={visit} />
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
