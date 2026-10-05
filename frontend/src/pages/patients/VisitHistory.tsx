import { useState } from 'react'
import { Link } from 'react-router'

import { ApiError } from '@/api/client'
import { Pager } from '@/components/Pager'
import { SectionCard } from '@/components/SectionCard'
import { StatusPill } from '@/components/StatusPill'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { humanize, parseDay } from '@/lib/format'
import { dispositionLabel } from '@/lib/status'
import { useNow } from '@/lib/useNow'
import { cn } from '@/lib/utils'
import { visitState } from '@/lib/visitState'
import { usePatientVisits, VISITS_PER_PAGE } from '@/pages/patients/usePatients'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

function formatDay(day: string): string {
  return parseDay(day).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

/** A patient's visits, newest first. Each date opens that visit. */
export function VisitHistory({ patientId }: { patientId: number }) {
  const [page, setPage] = useState(1)
  const { data, error, isPending } = usePatientVisits(patientId, page, true)
  const now = useNow()

  return (
    <SectionCard title="Visit history">
      {isPending ? (
        <div role="status" aria-label="Loading the visit history" className="p-4">
          <Skeleton className="h-24" />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="px-4 py-5 text-sm text-danger">
          {error instanceof ApiError ? error.message : 'The visit history could not be loaded.'}
        </p>
      ) : null}

      {data && data.items.length === 0 ? (
        <p className="px-4 py-5 text-sm text-muted-foreground">
          This patient has not visited the clinic yet.
        </p>
      ) : null}

      {data && data.items.length > 0 ? (
        <>
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(HEAD_CLASS, 'pl-4')}>Date</TableHead>
                <TableHead className={HEAD_CLASS}>Type</TableHead>
                <TableHead className={HEAD_CLASS}>Complaint</TableHead>
                <TableHead className={HEAD_CLASS}>Assessment or diagnosis</TableHead>
                <TableHead className={HEAD_CLASS}>Outcome</TableHead>
                <TableHead className={cn(HEAD_CLASS, 'pr-4')}>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.items.map((visit) => {
                const state = visitState(visit, now)
                return (
                  <TableRow key={visit.id} className="relative">
                    <TableCell className="py-3 pl-4 whitespace-nowrap">
                      <Link
                        to={`/visits/${visit.id}`}
                        className="rounded-sm text-[15px] font-medium tabular-nums outline-none after:absolute after:inset-0 hover:underline focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {formatDay(visit.visit_date)}
                      </Link>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-muted-foreground">
                      {humanize(visit.visit_type)}
                    </TableCell>
                    <TableCell className="max-w-56 py-3 text-sm whitespace-normal">
                      {visit.complaint}
                    </TableCell>
                    <TableCell className="max-w-64 py-3 text-sm whitespace-normal">
                      {visit.diagnosis ?? visit.assessment ?? (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 text-sm">
                      {visit.disposition ? (
                        dispositionLabel(visit.disposition)
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-3 pr-4">
                      <StatusPill tone={state.tone}>{state.label}</StatusPill>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          <Pager
            page={page}
            pageSize={VISITS_PER_PAGE}
            total={data.total}
            noun="visits"
            onPageChange={setPage}
          />
        </>
      ) : null}
    </SectionCard>
  )
}
