import { LockIcon } from 'lucide-react'

import type { Visit } from '@/api/types'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecordLock } from '@/lib/useRecordLock'
import { ConsultationForm } from '@/pages/visits/ConsultationForm'
import { RecordForm } from '@/pages/visits/RecordForm'

export type EditMode = 'record' | 'consultation'

type EditVisitProps = {
  visit: Visit
  mode: EditMode
  onDone: () => void
  onDirtyChange: (isDirty: boolean) => void
}

/**
 * A visit form behind the record's edit lock. The lock is held for as long as this is
 * on screen, so two people cannot overwrite each other's notes on the same visit.
 */
export function EditVisit({ visit, mode, onDone, onDirtyChange }: EditVisitProps) {
  const lock = useRecordLock('visit', visit.id)

  if (lock.state === 'acquiring') {
    return (
      <div
        role="status"
        aria-label="Opening the record for editing"
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
      </div>
    )
  }

  if (lock.state === 'refused') {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert>
          <LockIcon />
          <AlertTitle>This record cannot be edited right now</AlertTitle>
          <AlertDescription>{lock.message}</AlertDescription>
        </Alert>
        <Button variant="outline" onClick={onDone}>
          Back to the record
        </Button>
      </div>
    )
  }

  return mode === 'record' ? (
    <RecordForm visit={visit} onDone={onDone} onDirtyChange={onDirtyChange} />
  ) : (
    <ConsultationForm visit={visit} onDone={onDone} onDirtyChange={onDirtyChange} />
  )
}
