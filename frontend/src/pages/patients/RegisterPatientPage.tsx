import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { SectionCard } from '@/components/SectionCard'
import { useUnsavedChangesWarning } from '@/lib/useUnsavedChangesWarning'
import { PatientForm } from '@/pages/patients/PatientForm'
import { createRequest, emptyPatient } from '@/pages/patients/patientValues'
import { useRegisterPatient } from '@/pages/patients/usePatients'

/** Registers a new patient, then opens the new record so they can be checked in. */
export function RegisterPatientPage() {
  const navigate = useNavigate()
  const register = useRegisterPatient()
  const [initialValues] = useState(emptyPatient)
  const [isDirty, setIsDirty] = useState(false)
  useUnsavedChangesWarning(isDirty && !register.isSuccess)

  return (
    <SectionCard title="New patient record" className="mx-auto max-w-4xl">
      <div className="p-4 md:p-6">
        <PatientForm
          initialValues={initialValues}
          submitLabel="Register patient"
          savingLabel="Registering…"
          isSaving={register.isPending}
          error={register.error}
          onDirtyChange={setIsDirty}
          onCancel={() => void navigate('/patients')}
          onSubmit={(values) =>
            register.mutate(createRequest(values), {
              onSuccess: (patient) => {
                toast.success(`${patient.full_name} registered`)
                void navigate(`/patients/${patient.id}`)
              },
            })
          }
        />
      </div>
    </SectionCard>
  )
}
