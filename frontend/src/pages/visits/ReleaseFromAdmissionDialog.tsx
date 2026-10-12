import { DoorOpenIcon } from 'lucide-react'
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
import { Field, FieldLabel } from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { RELEASE_DISPOSITIONS } from '@/lib/status'
import { useReleaseFromAdmission } from '@/pages/visits/useVisits'

/** Records that an admitted patient has rested and left, and where they went. */
export function ReleaseFromAdmissionDialog({ visit }: { visit: Visit }) {
  const [isOpen, setIsOpen] = useState(false)
  const [disposition, setDisposition] = useState<VisitDisposition>('returned')
  const release = useReleaseFromAdmission(visit.id)
  const name = visit.patient.full_name

  function handleOpenChange(open: boolean) {
    setIsOpen(open)
    if (open) setDisposition('returned')
    else release.reset()
  }

  function confirm() {
    release.mutate(disposition, {
      onSuccess: () => {
        toast.success(`${name} released from admission`)
        handleOpenChange(false)
      },
    })
  }

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button>
          <DoorOpenIcon data-icon="inline-start" />
          Release from admission
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Release from admission?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} was admitted to rest in the clinic. The time they leave is recorded as now.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <Field>
          <FieldLabel htmlFor="release-disposition">After admission</FieldLabel>
          <NativeSelect
            id="release-disposition"
            name="release_disposition"
            value={disposition}
            onChange={(event) => setDisposition(event.target.value as VisitDisposition)}
          >
            {RELEASE_DISPOSITIONS.map((option) => (
              <NativeSelectOption key={option.value} value={option.value}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>

        {release.error ? (
          <p role="alert" className="text-sm text-danger">
            {release.error instanceof ApiError
              ? release.error.message
              : 'The release could not be recorded. Please try again.'}
          </p>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={release.isPending}>Not yet</AlertDialogCancel>
          {/* A plain button, so the dialog stays open if the server refuses. */}
          <Button disabled={release.isPending} onClick={confirm}>
            {release.isPending ? <Spinner data-icon="inline-start" /> : null}
            Release
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
