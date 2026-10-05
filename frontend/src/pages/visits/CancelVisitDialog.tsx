import { useState } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Visit } from '@/api/types'
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
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCancelVisit } from '@/pages/visits/useVisits'

/** Asks for confirmation, and optionally a reason, before cancelling an open visit. */
export function CancelVisitDialog({ visit }: { visit: Visit }) {
  const [isOpen, setIsOpen] = useState(false)
  const [reason, setReason] = useState('')
  const cancel = useCancelVisit(visit.id)
  const name = visit.patient.full_name

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (!open) {
      setReason('')
      cancel.reset()
    }
  }

  function confirm() {
    cancel.mutate(reason, {
      onSuccess: () => {
        toast.success(`Visit cancelled for ${name}`)
        handleOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" className="text-destructive">
          Cancel visit
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this visit?</AlertDialogTitle>
          <AlertDialogDescription>
            {name}’s visit will be marked as cancelled and leave today’s log. It stays in the
            records and cannot be reopened; the patient can be checked in again.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Field>
          <FieldLabel htmlFor="cancel-reason">Reason (optional)</FieldLabel>
          <Input
            id="cancel-reason"
            name="reason"
            maxLength={255}
            autoComplete="off"
            placeholder="e.g. checked in under the wrong patient…"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <FieldDescription>Saved with the visit and in the audit log.</FieldDescription>
        </Field>

        {cancel.error ? (
          <p role="alert" className="text-sm text-danger">
            {cancel.error instanceof ApiError
              ? cancel.error.message
              : 'The visit could not be cancelled. Please try again.'}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={cancel.isPending}>Keep visit</AlertDialogCancel>
          {/* A plain button, so the dialog stays open if the server refuses. */}
          <Button variant="destructive" disabled={cancel.isPending} onClick={confirm}>
            {cancel.isPending ? <Spinner data-icon="inline-start" /> : null}
            Cancel visit
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
