import { useLive } from '@/live/liveContext'
import type { LiveStatus } from '@/live/liveSocket'
import { cn } from '@/lib/utils'

const LABELS: Record<LiveStatus, string> = {
  connecting: 'Connecting to clinic server…',
  connected: 'Clinic server connected',
  offline: 'Clinic server offline · retrying',
}

const DETAILS: Record<LiveStatus, string> = {
  connecting: 'Live updates start once the server answers.',
  connected: 'Changes made at other stations appear here as they happen.',
  offline: 'Changes made at other stations will not appear until the connection returns.',
}

const DOT_CLASSES: Record<LiveStatus, string> = {
  connecting: 'bg-warning',
  connected: 'bg-success',
  offline: 'bg-danger',
}

/**
 * Tells the station whether it is still receiving live updates from the clinic server:
 * a coloured dot, with the details shown on hover or keyboard focus.
 */
export function ConnectionStatus({ className }: { className?: string }) {
  const { status, latencyMs } = useLive()
  const showLatency = status === 'connected' && latencyMs !== null

  return (
    <div className={cn('group relative', className)}>
      <button
        type="button"
        aria-describedby="connection-details"
        className={cn(
          'flex size-8 items-center justify-center rounded-full border bg-card outline-none focus-visible:ring-2 focus-visible:ring-ring',
          status === 'offline' && 'border-danger/40',
        )}
      >
        <span aria-hidden="true" className={cn('size-2.5 rounded-full', DOT_CLASSES[status])} />
        {/* Read out when the state changes, without the response time, which changes constantly. */}
        <span role="status" className="sr-only">
          {LABELS[status]}
        </span>
      </button>

      <div
        id="connection-details"
        role="tooltip"
        className="pointer-events-none invisible absolute top-full right-0 z-50 mt-2 w-64 rounded-md border bg-popover px-3 py-2 text-[13px] text-popover-foreground opacity-0 shadow-md transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
      >
        <p className={cn('font-medium', status === 'offline' && 'text-danger')}>{LABELS[status]}</p>
        <p className="mt-0.5 text-muted-foreground">{DETAILS[status]}</p>
        {showLatency ? (
          <p className="mt-1 text-muted-foreground">
            Response time <span className="font-medium tabular-nums">{latencyMs} ms</span>
          </p>
        ) : null}
      </div>
    </div>
  )
}
