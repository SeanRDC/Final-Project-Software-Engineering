// The Archive page: patient records taken out of use, and restoring them (coordinator).

import { ArchiveIcon, ArchiveRestoreIcon, CircleAlertIcon, SearchIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { PatientSummary } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { Pager } from '@/components/Pager'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
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
import { Spinner } from '@/components/ui/spinner'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTimeOfDay, patientTypeLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import {
  PATIENTS_PER_PAGE,
  useArchivedPatients,
  useSetArchived,
} from '@/pages/patients/usePatients'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

/** "Oct 12, 2026, 10:30 AM" */
function archivedWhen(moment: string): string {
  const day = new Date(moment).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${day}, ${formatTimeOfDay(moment)}`
}

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
          aria-label="Search the archive"
          placeholder="Name or ID number…"
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

/** Puts an archived record back into search and check-in, after confirmation. */
function RestoreButton({ patient }: { patient: PatientSummary }) {
  const [isOpen, setIsOpen] = useState(false)
  const setArchived = useSetArchived(patient.id)
  const name = patient.full_name

  function restore() {
    setArchived.mutate(false, {
      onSuccess: () => {
        toast.success(`${name}’s record restored`)
        setIsOpen(false)
      },
    })
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
        <Button variant="outline" size="sm" aria-label={`Restore ${name}`}>
          <ArchiveRestoreIcon data-icon="inline-start" />
          Restore
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Restore this record?</AlertDialogTitle>
          <AlertDialogDescription>
            {name} will appear in patient search again and can be checked in. The record and its
            visit history are as they were when it was archived.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {setArchived.error ? (
          <p role="alert" className="text-sm text-danger">
            {setArchived.error instanceof ApiError
              ? setArchived.error.message
              : 'The record could not be restored. Please try again.'}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={setArchived.isPending}>Keep archived</AlertDialogCancel>
          <Button disabled={setArchived.isPending} onClick={restore}>
            {setArchived.isPending ? <Spinner data-icon="inline-start" /> : null}
            Restore record
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

/** Archived patient records: anyone can look, only the coordinator restores. */
export function ArchivePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const allowed = useCan()
  const canRestore = allowed('patients:archive')

  const q = searchParams.get('q') ?? ''
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const { data, error, isPending, isPlaceholderData } = useArchivedPatients({ q, page })

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams)
    if (!('page' in changes)) next.delete('page')
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value)
      else next.delete(key)
    }
    setSearchParams(next)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SearchBox key={q} term={q} onSearch={(term) => update({ q: term || null })} />
        <p className="text-sm text-muted-foreground">
          Archived records are kept, never deleted.
          {canRestore ? '' : ' Only the clinic coordinator can restore them.'}
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The archive could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div role="status" aria-label="Loading the archive" className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : null}

      {data ? (
        <section
          aria-label="Archived patients"
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
                  <ArchiveIcon />
                </EmptyMedia>
                <EmptyTitle>{q ? 'No archived record matches' : 'No archived patients'}</EmptyTitle>
                <EmptyDescription>
                  {q
                    ? 'Check the spelling or try the ID number.'
                    : 'Records the coordinator archives are listed here and can be restored.'}
                </EmptyDescription>
              </EmptyHeader>
              {q ? (
                <EmptyContent>
                  <Button variant="outline" onClick={() => setSearchParams({})}>
                    Clear search
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/60">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className={cn(HEAD_CLASS, 'pl-4')}>Name</TableHead>
                      <TableHead className={HEAD_CLASS}>ID number</TableHead>
                      <TableHead className={HEAD_CLASS}>Type</TableHead>
                      <TableHead className={HEAD_CLASS}>Archived</TableHead>
                      <TableHead className={cn(HEAD_CLASS, !canRestore && 'pr-4')}>
                        Archived by
                      </TableHead>
                      {canRestore ? (
                        <TableHead className={cn(HEAD_CLASS, 'pr-4 text-right')}>
                          <span className="sr-only">Restore</span>
                        </TableHead>
                      ) : null}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((patient) => (
                      <TableRow key={patient.id}>
                        <TableCell className="py-3 pl-4">
                          <Link
                            to={`/patients/${patient.id}`}
                            className="rounded-sm text-[15px] font-medium outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            {patient.full_name}
                          </Link>
                        </TableCell>
                        <TableCell className="py-3 text-sm tabular-nums">
                          {patient.id_number}
                        </TableCell>
                        <TableCell className="py-3 text-sm">
                          {patientTypeLabel(patient.patient_type)}
                        </TableCell>
                        <TableCell className="py-3 text-sm whitespace-nowrap tabular-nums">
                          {patient.archived_at ? archivedWhen(patient.archived_at) : '—'}
                        </TableCell>
                        <TableCell className={cn('py-3 text-sm', !canRestore && 'pr-4')}>
                          {patient.archived_by_name ?? '—'}
                        </TableCell>
                        {canRestore ? (
                          <TableCell className="py-2 pr-4 text-right">
                            <RestoreButton patient={patient} />
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <Pager
                page={page}
                pageSize={PATIENTS_PER_PAGE}
                total={data.total}
                noun="records"
                onPageChange={(next) => update({ page: next > 1 ? String(next) : null })}
              />
            </>
          )}
        </section>
      ) : null}
    </div>
  )
}
