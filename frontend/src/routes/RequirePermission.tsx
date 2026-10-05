import { ShieldAlertIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { useCan, type Permission } from '@/auth/permissions'
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'

type RequirePermissionProps = {
  permission?: Permission
  children: ReactNode
}

/** Shows a screen only to accounts allowed to use it, e.g. when an address is typed by hand. */
export function RequirePermission({ permission, children }: RequirePermissionProps) {
  const allowed = useCan()

  if (allowed(permission)) return children

  return (
    <Empty className="rounded-lg border bg-card">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ShieldAlertIcon />
        </EmptyMedia>
        <EmptyTitle>Not available for your account</EmptyTitle>
        <EmptyDescription>
          Your role does not include this screen. Ask the Clinic Coordinator if you need access.
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
