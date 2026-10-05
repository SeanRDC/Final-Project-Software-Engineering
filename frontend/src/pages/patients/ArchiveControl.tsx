import { ArchiveIcon, ArchiveRestoreIcon } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Patient } from '@/api/types'
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
import { useSetArchived } from '@/pages/patients/usePatients'

/**
 * Archives a patient record after confirmation, or restores an archived one.
 * Records are never deleted: the clinic keeps them as its legal basis.
 */
export function ArchiveControl({ patient }: { patient: Patient }) {
  const [isOpen, setIsOpen] = useState(false)
  const setArchived = useSetArchived(patient.id)
  const name = patient.full_name

  function run(archived: boolean) {
    setArchived.mutate(archived, {
      onSuccess: () => {
        toast.success(archived ? `${name}’s record archived` : `${name}’s record restored`)
        setIsOpen(false)
      },
      onError: (error) => {
        if (archived) return // The dialog shows it.
        toast.error(`Could not restore ${name}’s record`, {
          description: error instanceof ApiError ? error.message : 'Please try again.',
        })
      },
    })
  }

  if (patient.is_archived) {
    return (
      <Button variant="outline" disabled={setArchived.isPending} onClick={() => run(false)}>
        {setArchived.isPending ? (
          <Spinner data-icon="inline-start" />
        ) : (
          <ArchiveRestoreIcon data-icon="inline-start" />
        )}
        Restore record
      </Button>
    )
  }

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) setArchived.reset()
      }}
    >
      <AlertDialogTrigger asChild>
        <Button variant="outline">
          <ArchiveIcon data-icon="inline-start" />
          Archive
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Archive this record?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} will no longer appear in patient search and cannot be checked in. Nothing is
            deleted: the record and its visit history are kept, and you can restore it at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {setArchived.error ? (
          <p role="alert" className="text-sm text-danger">
            {setArchived.error instanceof ApiError
              ? setArchived.error.message
              : 'The record could not be archived. Please try again.'}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={setArchived.isPending}>Keep active</AlertDialogCancel>
          <Button variant="destructive" disabled={setArchived.isPending} onClick={() => run(true)}>
            {setArchived.isPending ? <Spinner data-icon="inline-start" /> : null}
            Archive record
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
