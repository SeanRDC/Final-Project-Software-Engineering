import { CheckIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Visit, VisitDisposition } from '@/api/types'
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
import { Spinner } from '@/components/ui/spinner'
import { OutcomeField } from '@/pages/visits/formFields'
import { useCompleteVisit } from '@/pages/visits/useVisits'

/** Confirms the end of a visit and records how it ended. */
export function CompleteVisitDialog({ visit }: { visit: Visit }) {
  const [isOpen, setIsOpen] = useState(false)
  const [disposition, setDisposition] = useState<VisitDisposition | ''>(visit.disposition ?? '')
  const complete = useCompleteVisit(visit.id)
  const name = visit.patient.full_name

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (open) setDisposition(visit.disposition ?? '')
    else complete.reset()
  }

  function confirm() {
    complete.mutate(disposition || null, {
      onSuccess: () => {
        toast.success(`Visit completed for ${name}`)
        handleOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button>
          <CheckIcon data-icon="inline-start" />
          Complete visit
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Complete this visit?</AlertDialogTitle>
          <AlertDialogDescription>
            {name}’s visit will close and become part of their history. The record can still be
            corrected afterwards.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <OutcomeField id="complete-disposition" value={disposition} onChange={setDisposition} />

        {complete.error ? (
          <p role="alert" className="text-sm text-danger">
            {complete.error instanceof ApiError
              ? complete.error.message
              : 'The visit could not be completed. Please try again.'}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={complete.isPending}>Not yet</AlertDialogCancel>
          {/* A plain button, so the dialog stays open if the server refuses. */}
          <Button disabled={complete.isPending} onClick={confirm}>
            {complete.isPending ? <Spinner data-icon="inline-start" /> : null}
            Complete visit
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
