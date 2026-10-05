import { CircleAlertIcon, SearchIcon, UserPlusIcon, UsersIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'

import { ApiError } from '@/api/client'
import type { PatientType } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { Pager } from '@/components/Pager'
import { StatusPill } from '@/components/StatusPill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { humanize } from '@/lib/format'
import { cn } from '@/lib/utils'
import { PATIENTS_PER_PAGE, usePatientList } from '@/pages/patients/usePatients'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

const TYPES: { value: PatientType | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'student', label: 'Students' },
  { value: 'employee', label: 'Employees' },
]

function parseType(value: string | null): PatientType | '' {
  return value === 'student' || value === 'employee' ? value : ''
}

/** The search box. Keyed by the term in the address, so a search from the sidebar shows here too. */
function SearchBox({ term, onSearch }: { term: string; onSearch: (term: string) => void }) {
  const [value, setValue] = useState(term)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    onSearch(value.trim())
  }

  return (
    <form role="search" onSubmit={handleSubmit} className="flex min-w-0 flex-1 gap-2 sm:max-w-md">
      <InputGroup className="h-10 bg-card">
        <InputGroupAddon>
          <SearchIcon />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          name="q"
          aria-label="Search by name, ID number or department"
          placeholder="Name, ID number or department…"
          autoComplete="off"
          value={value}
          onChange={(event) => setValue(event.target.value)}
        />
      </InputGroup>
      <Button type="submit" variant="outline" className="h-10 bg-card px-4">
        Search
      </Button>
    </form>
  )
}

/** The patient list: search, filter by type, and open or register a record. */
export function PatientsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const allowed = useCan()

  // Search, filters and page live in the address, so they survive a reload and the back button.
  const q = searchParams.get('q') ?? ''
  const patientType = parseType(searchParams.get('type'))
  const includeArchived = searchParams.get('archived') === '1'
  const page = Math.max(1, Number(searchParams.get('page')) || 1)

  const { data, error, isPending, isPlaceholderData } = usePatientList({
    q,
    patientType,
    includeArchived,
    page,
  })

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    // Any change to what is searched for starts again from the first page.
    if (!('page' in changes)) next.delete('page')
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next)
  }

  const isFiltered = Boolean(q || patientType || includeArchived)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox key={q} term={q} onSearch={(term) => update({ q: term || null })} />
        {allowed('patients:write') ? (
          <Button asChild size="lg" className="h-10 px-4">
            <Link to="/patients/new">
              <UserPlusIcon data-icon="inline-start" />
              Register patient
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Patient type"
          value={patientType || 'all'}
          onValueChange={(next) => next && update({ type: next === 'all' ? null : next })}
        >
          {TYPES.map((type) => (
            <ToggleGroupItem key={type.value} value={type.value} className="bg-card px-3">
              {type.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox
            checked={includeArchived}
            onCheckedChange={(state) => update({ archived: state === true ? '1' : null })}
          />
          Include archived records
        </label>
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The patient list could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div role="status" aria-label="Loading patients" className="flex flex-col gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : null}

      {data ? (
        <section
          aria-label="Patients"
          aria-busy={isPlaceholderData}
          className={cn(
            'overflow-hidden rounded-lg border bg-card transition-opacity',
            isPlaceholderData && 'opacity-60',
          )}
        >
          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <UsersIcon />
                </EmptyMedia>
                <EmptyTitle>{isFiltered ? 'No patient matches' : 'No patients yet'}</EmptyTitle>
                <EmptyDescription>
                  {isFiltered
                    ? 'Check the spelling, try the student or employee number, or clear the filters.'
                    : 'Register the first patient to start the clinic’s records.'}
                </EmptyDescription>
              </EmptyHeader>
              {isFiltered ? (
                <EmptyContent>
                  <Button variant="outline" onClick={() => setSearchParams({})}>
                    Clear search and filters
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <>
              <Table>
                <TableHeader className="bg-muted/60">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={cn(HEAD_CLASS, 'pl-4')}>Name</TableHead>
                    <TableHead className={HEAD_CLASS}>ID number</TableHead>
                    <TableHead className={HEAD_CLASS}>Type</TableHead>
                    <TableHead className={HEAD_CLASS}>Age</TableHead>
                    <TableHead className={HEAD_CLASS}>Sex</TableHead>
                    <TableHead className={cn(HEAD_CLASS, 'pr-4')}>Department</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((patient) => (
                    <TableRow key={patient.id} className="relative">
                      <TableCell className="py-3 pl-4">
                        {/* The link's hit area is stretched over the whole row. */}
                        <Link
                          to={`/patients/${patient.id}`}
                          className="rounded-sm text-[15px] font-medium outline-none after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                        >
                          {patient.full_name}
                        </Link>
                        {patient.is_archived ? (
                          <StatusPill className="ml-2 align-middle">Archived</StatusPill>
                        ) : null}
                      </TableCell>
                      <TableCell className="py-3 text-sm tabular-nums">
                        {patient.id_number}
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        {humanize(patient.patient_type)}
                      </TableCell>
                      <TableCell className="py-3 text-sm tabular-nums">
                        {patient.age ?? '—'}
                      </TableCell>
                      <TableCell className="py-3 text-sm">
                        {patient.sex ? humanize(patient.sex) : '—'}
                      </TableCell>
                      <TableCell className="max-w-64 truncate py-3 pr-4 text-sm">
                        {patient.department ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pager
                page={page}
                pageSize={PATIENTS_PER_PAGE}
                total={data.total}
                noun="patients"
                onPageChange={(next) => update({ page: next > 1 ? String(next) : null })}
              />
            </>
          )}
        </section>
      ) : null}
    </div>
  )
}
