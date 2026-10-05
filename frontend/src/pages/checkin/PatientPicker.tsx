import { SearchIcon, UserPlusIcon } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'

import { ApiError } from '@/api/client'
import type { PatientSummary } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { Button } from '@/components/ui/button'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Spinner } from '@/components/ui/spinner'
import { describePatient } from '@/lib/visitState'
import { MIN_SEARCH_LENGTH, usePatientSearch } from '@/pages/checkin/usePatientSearch'

type PatientPickerProps = {
  onSelect: (patient: PatientSummary) => void
}

/** Finds a patient record by name or ID number and hands the chosen one back. */
export function PatientPicker({ onSelect }: PatientPickerProps) {
  const inputId = useId()
  const [term, setTerm] = useState('')
  const { patients, total, hasSearched, isSearching, error } = usePatientSearch(term)
  const allowed = useCan()
  const tooShort = term.trim().length < MIN_SEARCH_LENGTH

  return (
    <div className="flex flex-col gap-3">
      <label htmlFor={inputId} className="text-sm font-medium">
        Find the patient
      </label>
      <InputGroup className="h-10">
        <InputGroupAddon>{isSearching ? <Spinner /> : <SearchIcon />}</InputGroupAddon>
        <InputGroupInput
          id={inputId}
          type="search"
          name="patient-search"
          placeholder="Name or ID number…"
          autoComplete="off"
          autoFocus
          value={term}
          onChange={(event) => setTerm(event.target.value)}
        />
      </InputGroup>

      <div aria-live="polite" className="flex flex-col gap-3">
        {tooShort ? (
          <p className="text-sm text-muted-foreground">
            Type at least {MIN_SEARCH_LENGTH} characters of the name or the student or employee
            number.
          </p>
        ) : null}

        {error ? (
          <p className="text-sm text-danger">
            {error instanceof ApiError ? error.message : 'The search could not be completed.'}
          </p>
        ) : null}

        {patients.length > 0 ? (
          <ul aria-label="Matching patients" className="divide-y overflow-hidden rounded-md border">
            {patients.map((patient) => (
              <li key={patient.id}>
                <button
                  type="button"
                  onClick={() => onSelect(patient)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left outline-none hover:bg-muted focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-medium">
                      {patient.full_name}
                    </span>
                    <span className="block truncate text-sm text-muted-foreground">
                      {describePatient(patient)}
                      {patient.department ? ` · ${patient.department}` : ''}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                    {patient.id_number}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        {patients.length > 0 && total > patients.length ? (
          <p className="text-sm text-muted-foreground">
            Showing {patients.length} of {total} matches. Keep typing to narrow them down.
          </p>
        ) : null}

        {hasSearched && patients.length === 0 ? (
          <div className="flex flex-col items-start gap-2 rounded-md border border-dashed p-4">
            <p className="text-sm">
              No patient record matches <span className="font-medium">“{term.trim()}”</span>.
            </p>
            {allowed('patients:write') ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/patients/new">
                  <UserPlusIcon data-icon="inline-start" />
                  Register new patient
                </Link>
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
