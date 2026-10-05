import { ClipboardListIcon } from 'lucide-react'
import { Link } from 'react-router'

import type { VisitSummary } from '@/api/types'
import { SectionCard } from '@/components/SectionCard'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { useNow } from '@/lib/useNow'
import { VisitCard } from '@/pages/dashboard/VisitCard'

// The dashboard is a summary; the full log has its own screen.
const MAX_CARDS = 9

type TodaysVisitsProps = {
  /** In the order the API sends them: open visits by arrival, then completed ones. */
  visits: VisitSummary[]
}

export function TodaysVisits({ visits }: TodaysVisitsProps) {
  const now = useNow()
  const shown = visits.slice(0, MAX_CARDS)
  const hidden = visits.length - shown.length

  return (
    <SectionCard
      title="Today's visits"
      action={
        <Link to="/visits" className="rounded-sm underline-offset-4 hover:underline">
          Open full log
        </Link>
      }
    >
      {visits.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ClipboardListIcon />
            </EmptyMedia>
            <EmptyTitle>No visits yet today</EmptyTitle>
            <EmptyDescription>
              Patients appear here as soon as they are checked in at the front desk.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="p-4">
          <ul className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">
            {shown.map((visit) => (
              <li key={visit.id} className="grid">
                <VisitCard visit={visit} now={now} />
              </li>
            ))}
          </ul>
          {hidden > 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              {hidden} more in the{' '}
              <Link
                to="/visits"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                full log
              </Link>
              .
            </p>
          ) : null}
        </div>
      )}
    </SectionCard>
  )
}
