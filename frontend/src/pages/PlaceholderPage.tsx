import { ArrowLeftIcon, HammerIcon } from 'lucide-react'
import { Link } from 'react-router'

import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'

/** Stands in for a screen that has a place in the navigation but is not built yet. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Empty className="rounded-lg border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <HammerIcon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          This screen is being built next. The dashboard already shows today's visits, appointments
          and stock alerts.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link to="/">
            <ArrowLeftIcon data-icon="inline-start" />
            Back to the dashboard
          </Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}
