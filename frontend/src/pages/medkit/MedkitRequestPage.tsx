// One kit loan: the request, the kit and its contents, and what can be done next.

import {
  ArrowLeftIcon,
  CircleAlertIcon,
  PackageCheckIcon,
  PackageOpenIcon,
  PrinterIcon,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams } from 'react-router'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { MedkitRequest } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { SectionCard } from '@/components/SectionCard'
import { StatusPill } from '@/components/StatusPill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { formatTimeOfDay } from '@/lib/format'
import { IssueKitDialog } from '@/pages/medkit/IssueKitDialog'
import { formatShortDay, kitName, requestState } from '@/pages/medkit/medkitDisplay'
import { ReturnKitDialog } from '@/pages/medkit/ReturnKitDialog'
import { useCancelMedkitRequest, useMarkKitLost, useMedkitRequest } from '@/pages/medkit/useMedkits'

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-[15px]">
        {children ?? <span className="text-muted-foreground">—</span>}
      </dd>
    </div>
  )
}

function moment(value: string | null): string | null {
  if (!value) return null
  const day = new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return `${day}, ${formatTimeOfDay(value)}`
}

function MarkLostButton({ request }: { request: MedkitRequest }) {
  const [isOpen, setIsOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const markLost = useMarkKitLost(request.id)
  const kit = request.medkit ? `Kit #${request.medkit.kit_number}` : 'the kit'

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) markLost.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="bg-card">
          Mark lost
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Mark {kit} lost?</AlertDialogTitle>
          <AlertDialogDescription>
            Nothing returns to the medicine stock. As the request form says, the kit and its
            contents are replaced by the person responsible, {request.person_responsible}.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="lost-notes">What happened (optional)</FieldLabel>
          <Textarea
            id="lost-notes"
            rows={2}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </Field>
        {markLost.error ? (
          <p role="alert" className="text-sm text-danger">
            {markLost.error instanceof ApiError ? markLost.error.message : 'Please try again.'}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={markLost.isPending}>Keep as out</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={markLost.isPending}
            onClick={() =>
              markLost.mutate(notes, {
                onSuccess: () => {
                  toast.success(`${kit} marked lost`)
                  setIsOpen(false)
                },
              })
            }
          >
            {markLost.isPending ? <Spinner data-icon="inline-start" /> : null}
            Mark lost
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CancelButton({ request }: { request: MedkitRequest }) {
  const [isOpen, setIsOpen] = useState(false)
  const cancel = useCancelMedkitRequest(request.id)
  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) cancel.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="ghost">Cancel request</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this request?</AlertDialogTitle>
          <AlertDialogDescription>
            The request for {request.activity} is kept on record as cancelled. No kit was issued, so
            no stock changes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {cancel.error ? (
          <p role="alert" className="text-sm text-danger">
            {cancel.error instanceof ApiError ? cancel.error.message : 'Please try again.'}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>Keep request</AlertDialogCancel>
          <Button
            variant="destructive"
            disabled={cancel.isPending}
            onClick={() =>
              cancel.mutate(undefined, {
                onSuccess: () => {
                  toast.success(`Request for ${request.activity} cancelled`)
                  setIsOpen(false)
                },
              })
            }
          >
            {cancel.isPending ? <Spinner data-icon="inline-start" /> : null}
            Cancel request
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

export function MedkitRequestPage() {
  const { requestId } = useParams()
  const id = /^\d+$/.test(requestId ?? '') ? Number(requestId) : null
  const { data: request, error, isPending } = useMedkitRequest(id)
  const allowed = useCan()
  const canAct = allowed('medkits:write')
  const [dialog, setDialog] = useState<'issue' | 'return' | null>(null)

  const back = (
    <Button asChild variant="ghost" className="-ml-2 w-fit">
      <Link to="/medkit">
        <ArrowLeftIcon data-icon="inline-start" />
        All kit requests
      </Link>
    </Button>
  )

  if (id === null || (error instanceof ApiError && error.status === 404)) {
    return (
      <div className="flex flex-col gap-4">
        {back}
        <Alert>
          <CircleAlertIcon />
          <AlertTitle>No such kit request</AlertTitle>
          <AlertDescription>Check the address, or find the request in the list.</AlertDescription>
        </Alert>
      </div>
    )
  }
  if (error) {
    return (
      <Alert variant="destructive">
        <CircleAlertIcon />
        <AlertTitle>The kit request could not be loaded</AlertTitle>
        <AlertDescription>
          {error instanceof ApiError ? error.message : 'Something went wrong.'}
        </AlertDescription>
      </Alert>
    )
  }
  if (isPending || !request) {
    return (
      <div role="status" aria-label="Loading the kit request" className="flex flex-col gap-4">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-48" />
      </div>
    )
  }

  const state = requestState(request)
  const isOut = request.status === 'issued'
  const hasKit = request.items.length > 0
  const isClosed = request.status === 'returned' || request.status === 'lost'

  return (
    <div className="flex flex-col gap-4">
      {back}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold">{request.activity}</h2>
          <StatusPill tone={state.tone}>{state.label}</StatusPill>
          {request.medkit ? (
            <span className="text-sm text-muted-foreground">{kitName(request.medkit)}</span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {hasKit ? (
            <Button asChild variant="outline" className="bg-card">
              <Link to={`/print/medkit/${request.id}`} target="_blank" rel="noopener">
                <PrinterIcon data-icon="inline-start" />
                Print form
              </Link>
            </Button>
          ) : null}
          {canAct && request.status === 'requested' ? (
            <>
              <CancelButton request={request} />
              <Button onClick={() => setDialog('issue')}>
                <PackageOpenIcon data-icon="inline-start" />
                Issue kit
              </Button>
            </>
          ) : null}
          {canAct && isOut ? (
            <>
              <MarkLostButton request={request} />
              <Button onClick={() => setDialog('return')}>
                <PackageCheckIcon data-icon="inline-start" />
                Take back kit
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {request.is_overdue ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>This kit is overdue</AlertTitle>
          <AlertDescription>
            The activity was on {formatShortDay(request.activity_date)}. Ask{' '}
            {request.person_responsible}
            {request.contact_number ? ` (${request.contact_number})` : ''} to return it.
          </AlertDescription>
        </Alert>
      ) : null}
      {request.status === 'lost' ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>This kit was lost</AlertTitle>
          <AlertDescription>
            The kit and its contents are to be replaced by {request.person_responsible}. The
            coordinator puts the replacement back in service from the Kits page.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <SectionCard title="Request">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4">
            <div className="col-span-2">
              <Detail label="Organization / department">{request.organization}</Detail>
            </div>
            <Detail label="Date of activity">{formatShortDay(request.activity_date)}</Detail>
            <Detail label="Venue">{request.venue}</Detail>
            <Detail label="Person responsible">{request.person_responsible}</Detail>
            <Detail label="Contact number">{request.contact_number}</Detail>
            <Detail label="Requested by">{request.requested_by}</Detail>
            <Detail label="Date requested">{formatShortDay(request.request_date)}</Detail>
            {request.issued_at ? (
              <Detail label="Issued">
                {moment(request.issued_at)}
                {request.issued_by_name ? ` by ${request.issued_by_name}` : ''}
              </Detail>
            ) : null}
            {request.closed_at ? (
              <Detail label={request.status === 'cancelled' ? 'Cancelled' : 'Closed'}>
                {moment(request.closed_at)}
                {request.closed_by_name ? ` by ${request.closed_by_name}` : ''}
              </Detail>
            ) : null}
            {request.notes ? (
              <div className="col-span-2">
                <Detail label="Notes">
                  <span className="whitespace-pre-line">{request.notes}</span>
                </Detail>
              </div>
            ) : null}
          </dl>
        </SectionCard>

        <SectionCard title="Kit contents">
          {hasKit ? (
            <div className="overflow-x-auto">
              <table className="w-full text-[15px]">
                <thead>
                  <tr className="border-b text-[13px] text-muted-foreground">
                    <th scope="col" className="py-2 pl-4 text-left font-medium">
                      Medicine or supply
                    </th>
                    <th scope="col" className="px-4 py-2 text-right font-medium">
                      Issued
                    </th>
                    {isClosed ? (
                      <>
                        <th scope="col" className="px-4 py-2 text-right font-medium">
                          Returned
                        </th>
                        <th scope="col" className="py-2 pr-4 text-right font-medium">
                          Used
                        </th>
                      </>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {request.items.map((item) => (
                    <tr key={item.id}>
                      <th scope="row" className="py-2 pl-4 text-left font-normal">
                        {item.medicine_name}
                      </th>
                      <td className="px-4 py-2 text-right font-medium tabular-nums">
                        {item.quantity_issued}{' '}
                        <span className="font-normal text-muted-foreground">{item.unit}</span>
                      </td>
                      {isClosed ? (
                        <>
                          <td className="px-4 py-2 text-right tabular-nums">
                            {item.quantity_returned ?? '—'}
                          </td>
                          <td className="py-2 pr-4 text-right tabular-nums">
                            {item.quantity_used ?? '—'}
                          </td>
                        </>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="p-4 text-sm text-muted-foreground">
              {request.status === 'cancelled'
                ? 'No kit was issued.'
                : 'Not issued yet. Issuing the kit takes its contents out of the medicine stock.'}
            </p>
          )}
        </SectionCard>
      </div>

      <IssueKitDialog
        request={request}
        open={dialog === 'issue'}
        onOpenChange={(open) => setDialog(open ? 'issue' : null)}
      />
      <ReturnKitDialog
        request={request}
        open={dialog === 'return'}
        onOpenChange={(open) => setDialog(open ? 'return' : null)}
      />
    </div>
  )
}
