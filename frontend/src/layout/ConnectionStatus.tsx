import { useLive } from '@/live/liveContext'
import type { LiveStatus } from '@/live/liveSocket'
import { cn } from '@/lib/utils'

const LABELS: Record<LiveStatus, string> = {
  connecting: 'Connecting to clinic server…',
  connected: 'Clinic server connected',
  offline: 'Clinic server offline · retrying',
}

const DOT_CLASSES: Record<LiveStatus, string> = {
  connecting: 'bg-warning',
  connected: 'bg-success',
  offline: 'bg-danger',
}

/** Tells the station whether it is still receiving live updates from the clinic server. */
export function ConnectionStatus({ className }: { className?: string }) {
  const { status, latencyMs } = useLive()
  const showLatency = status === 'connected' && latencyMs !== null

  return (
    <div
      role="status"
      className={cn(
        'flex h-8 items-center gap-2 rounded-full border bg-card px-3 text-[13px] whitespace-nowrap text-foreground/80',
        status === 'offline' && 'border-danger/40 text-danger',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-2 rounded-full', DOT_CLASSES[status])} />
      <span>
        {LABELS[status]}
        {showLatency ? <span className="tabular-nums"> · {latencyMs} ms</span> : null}
      </span>
    </div>
  )
}
