import { useState } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Visit, VisitMedicine } from '@/api/types'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { formatTimeOfDay } from '@/lib/format'
import { ReleaseMedicineForm } from '@/pages/visits/ReleaseMedicineForm'
import { useUndoDispense } from '@/pages/visits/useVisits'

type MedicinesSectionProps = {
  visit: Visit
  /** Show the release form and the undo buttons. */
  canRelease: boolean
}

/** The medicines released during a visit, with the means to release more or undo a mistake. */
export function MedicinesSection({ visit, canRelease }: MedicinesSectionProps) {
  const undo = useUndoDispense(visit.id)
  const [toUndo, setToUndo] = useState<VisitMedicine | null>(null)

  function closeDialog() {
    setToUndo(null)
    undo.reset()
  }

  function confirmUndo(entry: VisitMedicine) {
    undo.mutate(entry.id, {
      onSuccess: () => {
        toast.success(`${entry.quantity} × ${entry.medicine_name} returned to stock`)
        closeDialog()
      },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {visit.medicines.length === 0 ? (
        <p className="text-sm text-muted-foreground">None.</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {visit.medicines.map((entry) => (
            <li key={entry.id} className="flex items-start justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <p className="text-[15px] font-medium">
                  {entry.medicine_name}{' '}
                  <span className="font-normal text-muted-foreground tabular-nums">
                    × {entry.quantity}
                  </span>
                </p>
                {entry.instructions ? (
                  <p className="text-sm text-muted-foreground">{entry.instructions}</p>
                ) : null}
                <p className="text-[13px] text-muted-foreground">
                  {formatTimeOfDay(entry.dispensed_at)}
                  {entry.dispensed_by_name ? ` · ${entry.dispensed_by_name}` : ''}
                </p>
              </div>
              {canRelease ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 text-muted-foreground"
                  aria-label={`Undo release of ${entry.medicine_name}`}
                  onClick={() => setToUndo(entry)}
                >
                  Undo
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canRelease ? <ReleaseMedicineForm visit={visit} /> : null}

      <AlertDialog open={toUndo !== null} onOpenChange={(open) => !open && closeDialog()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Undo this release?</AlertDialogTitle>
            <AlertDialogDescription>
              {toUndo
                ? `${toUndo.quantity} × ${toUndo.medicine_name} will be removed from the visit and returned to stock. Use this only when the release was recorded by mistake.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {undo.error ? (
            <p role="alert" className="text-sm text-danger">
              {undo.error instanceof ApiError
                ? undo.error.message
                : 'The release could not be undone. Please try again.'}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={undo.isPending}>Keep it</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={undo.isPending}
              onClick={() => toUndo && confirmUndo(toUndo)}
            >
              {undo.isPending ? <Spinner data-icon="inline-start" /> : null}
              Return to stock
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
