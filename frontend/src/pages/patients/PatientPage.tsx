import { ArrowLeftIcon, CalendarPlusIcon, ClipboardPlusIcon, PencilIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router'

import { ApiError } from '@/api/client'
import type { Patient } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { PatientAlertsBox } from '@/components/PatientAlertsBox'
import { SectionCard } from '@/components/SectionCard'
import { StatusPill } from '@/components/StatusPill'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { humanize, parseDay } from '@/lib/format'
import { describePatient } from '@/lib/visitState'
import { ArchiveControl } from '@/pages/patients/ArchiveControl'
import { Attachments } from '@/pages/patients/Attachments'
import { usePatient } from '@/pages/patients/usePatients'
import { VisitHistory } from '@/pages/patients/VisitHistory'

function formatDay(day: string | null): string | null {
  if (!day) return null
  return parseDay(day).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** One labelled value in a details list. An empty value is shown as a dash. */
function Detail({ label, children }: { label: string; children: ReactNode }) {
  const isEmpty = children === null || children === undefined || children === ''
  return (
    <div className="min-w-0">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd className="text-[15px] break-words whitespace-pre-line">
        {isEmpty ? <span className="text-muted-foreground">—</span> : children}
      </dd>
    </div>
  )
}

function Details({ patient }: { patient: Patient }) {
  const isStudent = patient.patient_type === 'student'
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <SectionCard title="Personal details">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4">
          <Detail label="Birth date">{formatDay(patient.birth_date)}</Detail>
          <Detail label="Sex">{patient.sex ? humanize(patient.sex) : null}</Detail>
          <Detail label={isStudent ? 'School or department' : 'Department or office'}>
            {patient.department}
          </Detail>
          <Detail label={isStudent ? 'Program and year' : 'Position'}>
            {patient.program_or_position}
          </Detail>
          <Detail label="Contact number">{patient.contact_number}</Detail>
          <Detail label="Email">{patient.email}</Detail>
          <div className="col-span-2">
            <Detail label="Address">{patient.address}</Detail>
          </div>
        </dl>
      </SectionCard>

      <div className="flex flex-col gap-6">
        <SectionCard title="Parent or guardian">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4">
            <Detail label="Name">{patient.guardian_name}</Detail>
            <Detail label="Relationship">{patient.guardian_relationship}</Detail>
            <Detail label="Contact number">{patient.guardian_contact}</Detail>
          </dl>
        </SectionCard>

        <SectionCard title="Medical information">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 p-4">
            <Detail label="Blood type">{patient.blood_type}</Detail>
            <Detail label="Privacy consent">
              {patient.consent_on_file ? 'Signed form on file' : 'Not on file'}
            </Detail>
            <div className="col-span-2">
              <Detail label="Other notes">{patient.notes}</Detail>
            </div>
          </dl>
        </SectionCard>
      </div>
    </div>
  )
}

/** A patient record at /patients/:patientId: who they are, their alerts and their visits. */
export function PatientPage() {
  const params = useParams()
  const allowed = useCan()
  const patientId = /^\d+$/.test(params.patientId ?? '') ? Number(params.patientId) : null
  const { data: patient, error, isPending } = usePatient(patientId)

  if (patientId === null || (error instanceof ApiError && error.status === 404)) {
    return (
      <Empty className="rounded-lg border bg-card">
        <EmptyHeader>
          <EmptyTitle>Patient not found</EmptyTitle>
          <EmptyDescription>There is no patient record at this address.</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild variant="outline">
            <Link to="/patients">
              <ArrowLeftIcon data-icon="inline-start" />
              Back to patients
            </Link>
          </Button>
        </EmptyContent>
      </Empty>
    )
  }

  if (isPending) {
    return (
      <div role="status" aria-label="Loading the patient record" className="flex flex-col gap-6">
        <Skeleton className="h-24 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
        <Skeleton className="h-40 rounded-lg" />
      </div>
    )
  }

  if (!patient) {
    return (
      <p role="alert" className="text-sm text-danger">
        {error instanceof ApiError ? error.message : 'The patient record could not be loaded.'}
      </p>
    )
  }

  const visitSummary =
    patient.visit_count === 0
      ? 'No visits yet'
      : `${patient.visit_count} ${patient.visit_count === 1 ? 'visit' : 'visits'} · last on ${formatDay(patient.last_visit_date)}`

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4 rounded-lg border bg-card p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">{patient.full_name}</h2>
            {patient.is_archived ? <StatusPill>Archived</StatusPill> : null}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            <span className="tabular-nums">{patient.id_number}</span> · {describePatient(patient)}
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">{visitSummary}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {allowed('patients:archive') ? <ArchiveControl patient={patient} /> : null}
          {allowed('patients:write') ? (
            <Button asChild variant="outline">
              <Link to={`/patients/${patient.id}/edit`}>
                <PencilIcon data-icon="inline-start" />
                Edit record
              </Link>
            </Button>
          ) : null}
          {allowed('appointments:write') && !patient.is_archived ? (
            <Button asChild variant="outline">
              <Link to={`/appointments/new?patient=${patient.id}`}>
                <CalendarPlusIcon data-icon="inline-start" />
                Book appointment
              </Link>
            </Button>
          ) : null}
          {allowed('visits:record') && !patient.is_archived ? (
            <Button asChild>
              <Link to={`/check-in?patient=${patient.id}`}>
                <ClipboardPlusIcon data-icon="inline-start" />
                Check in
              </Link>
            </Button>
          ) : null}
        </div>
      </header>

      <PatientAlertsBox alerts={patient} />
      <Details patient={patient} />
      {allowed('visits:read') ? <VisitHistory patientId={patient.id} /> : null}
      {allowed('attachments:read') ? <Attachments patientId={patient.id} /> : null}
    </div>
  )
}
