import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { BellIcon, CheckCheckIcon, CircleAlertIcon } from 'lucide-react'
import { useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'

import { api, ApiError } from '@/api/client'
import type { Notification, NotificationList } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { formatAgo, formatTimeOfDay } from '@/lib/format'
import { useNow } from '@/lib/useNow'
import { cn } from '@/lib/utils'

/** The most the API returns in one request. */
const LIMIT = 100

/** Where a notification leads, if the account can open that screen. */
function destination(item: Notification, allowed: ReturnType<typeof useCan>): string | null {
  if (item.entity_type === 'medicine' && allowed('inventory:read')) return '/inventory?low=1'
  if (item.entity_type === 'appointment' && allowed('appointments:read')) return '/appointments'
  return null
}

function fullTime(moment: string): string {
  const date = new Date(moment).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${date}, ${formatTimeOfDay(moment)}`
}

/** Every alert for the signed-in account: low stock and appointment decisions. */
export function NotificationsPage() {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const allowed = useCan()
  const now = useNow()
  const unreadOnly = searchParams.get('show') === 'unread'

  const { data, error, isPending } = useQuery({
    queryKey: ['notifications', 'list', unreadOnly],
    queryFn: ({ signal }) =>
      api<NotificationList>('/notifications', {
        query: { limit: LIMIT, unread_only: unreadOnly || undefined },
        signal,
      }),
  })

  // Read state is per account, and the bell and sidebar counts ride on the dashboard request.
  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ['notifications'] })
    void queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const markOne = useMutation({
    mutationFn: (id: number) => api(`/notifications/${id}/read`, { method: 'POST' }),
    onSuccess: refresh,
  })
  const markAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      toast.success('All notifications marked as read')
      refresh()
    },
    onError: (failure) =>
      toast.error('Could not mark the notifications as read', {
        description: failure instanceof ApiError ? failure.message : 'Please try again.',
      }),
  })

  function open(item: Notification) {
    if (!item.is_read) markOne.mutate(item.id)
    const target = destination(item, allowed)
    if (target) void navigate(target)
  }

  const unread = data?.unread_count ?? 0

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleGroup
          type="single"
          variant="outline"
          aria-label="Show notifications"
          value={unreadOnly ? 'unread' : 'all'}
          onValueChange={(next) =>
            next && setSearchParams(next === 'unread' ? { show: 'unread' } : {})
          }
        >
          <ToggleGroupItem value="all" className="bg-card px-3">
            All
          </ToggleGroupItem>
          <ToggleGroupItem value="unread" className="bg-card px-3">
            Unread
            <span className="text-muted-foreground tabular-nums">{unread}</span>
          </ToggleGroupItem>
        </ToggleGroup>
        <Button
          variant="outline"
          className="bg-card"
          disabled={unread === 0 || markAll.isPending}
          onClick={() => markAll.mutate()}
        >
          {markAll.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CheckCheckIcon data-icon="inline-start" />
          )}
          Mark all as read
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The notifications could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div role="status" aria-label="Loading notifications" className="flex flex-col gap-2">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-16 rounded-lg" />
          ))}
        </div>
      ) : null}

      {data ? (
        <section aria-label="Notifications" className="overflow-hidden rounded-lg border bg-card">
          {data.items.length === 0 ? (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <BellIcon />
                </EmptyMedia>
                <EmptyTitle>{unreadOnly ? 'Nothing unread' : 'No notifications yet'}</EmptyTitle>
                <EmptyDescription>
                  {unreadOnly
                    ? 'You have read every notification.'
                    : 'Low-stock alerts and appointment decisions appear here.'}
                </EmptyDescription>
              </EmptyHeader>
              {unreadOnly ? (
                <EmptyContent>
                  <Button variant="outline" onClick={() => setSearchParams({})}>
                    Show all notifications
                  </Button>
                </EmptyContent>
              ) : null}
            </Empty>
          ) : (
            <ul className="divide-y">
              {data.items.map((item) => {
                const target = destination(item, allowed)
                const isActionable = !item.is_read || target !== null
                const body = (
                  <>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-[7px] size-2 shrink-0 rounded-full',
                        item.is_read ? 'bg-transparent' : 'bg-primary',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className={cn('block text-[15px]', !item.is_read && 'font-medium')}>
                        {item.is_read ? null : <span className="sr-only">Unread: </span>}
                        {item.title}
                      </span>
                      {item.body ? (
                        <span className="block text-sm text-muted-foreground">{item.body}</span>
                      ) : null}
                    </span>
                    <time
                      dateTime={item.created_at}
                      title={fullTime(item.created_at)}
                      className="shrink-0 pt-0.5 text-[13px] text-muted-foreground tabular-nums"
                    >
                      {formatAgo(item.created_at, now)}
                    </time>
                  </>
                )
                return (
                  <li key={item.id}>
                    {isActionable ? (
                      <button
                        type="button"
                        onClick={() => open(item)}
                        className="flex w-full items-start gap-2.5 px-4 py-3 text-left outline-none hover:bg-muted focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      >
                        {body}
                      </button>
                    ) : (
                      <div className="flex items-start gap-2.5 px-4 py-3">{body}</div>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}
