import { Skeleton } from '@/components/ui/skeleton'

/** Placeholder blocks in the shape of the dashboard, shown while the first request is on its way. */
export function DashboardSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading the dashboard"
      className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_300px]"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-[104px] rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-56 rounded-lg" />
      </div>
      <div className="flex min-w-0 flex-col gap-6">
        <Skeleton className="h-72 rounded-lg" />
        <Skeleton className="h-44 rounded-lg" />
        <Skeleton className="h-44 rounded-lg" />
      </div>
    </div>
  )
}
