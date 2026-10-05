import { LockIcon } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Patient } from '@/api/types'
import { SectionCard } from '@/components/SectionCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRecordLock } from '@/lib/useRecordLock'
import { useUnsavedChangesWarning } from '@/lib/useUnsavedChangesWarning'
import { PatientForm } from '@/pages/patients/PatientForm'
import { patientChanges, patientValues } from '@/pages/patients/patientValues'
import { usePatient, useUpdatePatient } from '@/pages/patients/usePatients'

/** The form itself, mounted only once the record is loaded so it can hold the edit lock. */
function EditPatientForm({ patient }: { patient: Patient }) {
  const navigate = useNavigate()
  const lock = useRecordLock('patient', patient.id)
  const save = useUpdatePatient(patient.id)
  // Fixed at the moment editing starts; a background refetch must not reset the form.
  const [initialValues] = useState(() => patientValues(patient))
  const [isDirty, setIsDirty] = useState(false)
  useUnsavedChangesWarning(isDirty && !save.isSuccess)

  const recordPath = `/patients/${patient.id}`

  if (lock.state === 'acquiring') {
    return (
      <div
        role="status"
        aria-label="Opening the record for editing"
        className="flex flex-col gap-3"
      >
        <Skeleton className="h-24" />
        <Skeleton className="h-48" />
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
        <Button asChild variant="outline">
          <Link to={recordPath}>Back to the record</Link>
        </Button>
      </div>
    )
  }

  return (
    <PatientForm
      initialValues={initialValues}
      submitLabel="Save changes"
      savingLabel="Saving…"
      isSaving={save.isPending}
      error={save.error}
      onDirtyChange={setIsDirty}
      onCancel={() => void navigate(recordPath)}
      onSubmit={(values) => {
        const changes = patientChanges(patient, values)
        if (Object.keys(changes).length === 0) {
          void navigate(recordPath)
          return
        }
        save.mutate(changes, {
          onSuccess: (saved) => {
            toast.success(`Record saved for ${saved.full_name}`)
            void navigate(recordPath)
          },
        })
      }}
    />
  )
}

/** Corrects a patient record at /patients/:patientId/edit. */
export function EditPatientPage() {
  const params = useParams()
  const patientId = /^\d+$/.test(params.patientId ?? '') ? Number(params.patientId) : null
  const { data: patient, error, isPending } = usePatient(patientId)

  return (
    <SectionCard
      title={patient ? `Edit record · ${patient.full_name}` : 'Edit record'}
      className="mx-auto max-w-4xl"
    >
      <div className="p-4 md:p-6">
        {patientId !== null && isPending ? (
          <div role="status" aria-label="Loading the record" className="flex flex-col gap-3">
            <Skeleton className="h-24" />
            <Skeleton className="h-48" />
          </div>
        ) : null}

        {patientId === null || error ? (
          <p role="alert" className="text-sm text-danger">
            {error instanceof ApiError
              ? error.message
              : 'There is no patient record at this address.'}
          </p>
        ) : null}

        {patient?.is_archived ? (
          <Alert className="mb-6">
            <AlertTitle>This record is archived</AlertTitle>
            <AlertDescription>
              It can be corrected, but it stays hidden from search until the coordinator restores
              it.
            </AlertDescription>
          </Alert>
        ) : null}

        {patient ? <EditPatientForm key={patient.id} patient={patient} /> : null}
      </div>
    </SectionCard>
  )
}
