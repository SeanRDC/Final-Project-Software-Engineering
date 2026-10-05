import { CircleAlertIcon } from 'lucide-react'

import { ApiError } from '@/api/client'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'

type FormActionsProps = {
  /** The error of the last save attempt, if it failed. */
  error: unknown
  isSaving: boolean
  onCancel: () => void
}

/** The bottom of a visit form: why the last save failed, then Cancel and Save. */
export function FormActions({ error, isSaving, onCancel }: FormActionsProps) {
  return (
    <>
      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The changes were not saved</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'}
          </AlertDescription>
        </Alert>
      ) : null}
      <div className="sticky -bottom-4 -mx-4 -mb-4 flex justify-end gap-2 border-t bg-card px-4 py-3">
        <Button type="button" variant="outline" disabled={isSaving} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? <Spinner data-icon="inline-start" /> : null}
          {isSaving ? 'Saving…' : 'Save changes'}
        </Button>
      </div>
    </>
  )
}
