import { ArrowLeftIcon, CompassIcon } from 'lucide-react'
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

export function NotFoundPage() {
  return (
    <Empty className="rounded-lg border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <CompassIcon />
        </EmptyMedia>
        <EmptyTitle>Page not found</EmptyTitle>
        <EmptyDescription>
          There is nothing at this address. It may have been typed incorrectly.
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
