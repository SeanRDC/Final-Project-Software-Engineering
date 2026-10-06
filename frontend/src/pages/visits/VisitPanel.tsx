import { PencilIcon, StethoscopeIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'

import { ApiError } from '@/api/client'
import { useCan } from '@/auth/permissions'
import { StatusPill } from '@/components/StatusPill'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDuration, formatTimeOfDay, humanize, parseDay } from '@/lib/format'
import { useClinicToday } from '@/lib/useClinicToday'
import { useNow } from '@/lib/useNow'
import { describePatient, visitState } from '@/lib/visitState'
import { CancelVisitDialog } from '@/pages/visits/CancelVisitDialog'
import { CompleteVisitDialog } from '@/pages/visits/CompleteVisitDialog'
import { EditVisit, type EditMode } from '@/pages/visits/EditVisit'
import { useVisit } from '@/pages/visits/useVisits'
import { VisitRecord } from '@/pages/visits/VisitRecord'

const DISCARD_QUESTION = 'Discard the changes you have not saved?'

/** The visit at /visits/:visitId, shown in a panel over the visit log. */
export function VisitPanel() {
  const params = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const now = useNow()
  const allowed = useCan()
  // null shows the record; otherwise the named form is open for editing.
  const [editing, setEditing] = useState<EditMode | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  const visitId = /^\d+$/.test(params.visitId ?? '') ? Number(params.visitId) : null
  const { data: visit, error, isPending } = useVisit(visitId)
  const state = visit ? visitState(visit, now) : null

  function stopEditing() {
    setEditing(null)
    setIsDirty(false)
  }

  function close() {
    if (editing && isDirty && !window.confirm(DISCARD_QUESTION)) return
    const search = searchParams.toString()
    void navigate(`/visits${search ? `?${search}` : ''}`)
  }

  const notFound = visitId === null || (error instanceof ApiError && error.status === 404)
  const canRecord = allowed('visits:record')
  const today = useClinicToday()
  const canConsult = allowed('visits:consult')
  // A completed visit can still be corrected; a cancelled one is closed for good.
  const isEditable = visit !== undefined && visit.status !== 'cancelled'
  const isOpen = visit?.status === 'open'

  return (
    <Sheet open onOpenChange={(open) => !open && close()}>
      <SheetContent className="gap-0 overscroll-contain data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
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
                {allowed('patients:read') ? (
                  <>
                    {' · '}
                    <Link
                      to={`/patients/${visit.patient.id}`}
                      className="font-medium text-primary underline-offset-4 hover:underline"
                    >
                      Patient record
                    </Link>
                  </>
                ) : null}
                <br />
                {/* A visit entered late belongs to another day, which the times alone do not show. */}
                {visit.visit_date === today
                  ? ''
                  : `Visit of ${parseDay(visit.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} · `}
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

          {visit && editing ? (
            <EditVisit
              // A different visit or form starts from that visit's saved values.
              key={`${visit.id}-${editing}`}
              visit={visit}
              mode={editing}
              onDone={stopEditing}
              onDirtyChange={setIsDirty}
            />
          ) : null}

          {visit && !editing ? (
            <VisitRecord
              visit={visit}
              canReleaseMedicine={isEditable && allowed('medicines:dispense')}
              canAddReadings={isEditable && canRecord}
            />
          ) : null}
        </div>

        {visit && !editing && isEditable && (canRecord || canConsult) ? (
          <SheetFooter className="flex-row flex-wrap items-center justify-between gap-2 border-t">
            <div>{isOpen && canRecord ? <CancelVisitDialog visit={visit} /> : null}</div>
            <div className="flex flex-wrap items-center gap-2">
              {canRecord ? (
                <Button variant="outline" onClick={() => setEditing('record')}>
                  <PencilIcon data-icon="inline-start" />
                  {isOpen ? 'Record' : 'Correct record'}
                </Button>
              ) : null}
              {canConsult ? (
                <Button variant="outline" onClick={() => setEditing('consultation')}>
                  <StethoscopeIcon data-icon="inline-start" />
                  Consultation
                </Button>
              ) : null}
              {isOpen ? <CompleteVisitDialog visit={visit} /> : null}
            </div>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
