import {
  CalendarPlusIcon,
  ClipboardPlusIcon,
  SearchIcon,
  UserPlusIcon,
  type LucideIcon,
} from 'lucide-react'
import { Link } from 'react-router'

import { useCan, type Permission } from '@/auth/permissions'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Action = {
  to: string
  label: string
  icon: LucideIcon
  permission: Permission
  /** The one action the front desk uses most is drawn as the primary button. */
  primary?: boolean
}

const ACTIONS: Action[] = [
  {
    to: '/check-in',
    label: 'Check in patient',
    icon: ClipboardPlusIcon,
    permission: 'visits:record',
    primary: true,
  },
  {
    to: '/patients/new',
    label: 'Register new patient',
    icon: UserPlusIcon,
    permission: 'patients:write',
  },
  {
    to: '/appointments/new',
    label: 'New appointment',
    icon: CalendarPlusIcon,
    permission: 'appointments:write',
  },
  { to: '/patients', label: 'Search patient', icon: SearchIcon, permission: 'patients:read' },
]

/** The row of shortcuts at the top of the dashboard, limited to what the account may do. */
export function QuickActions() {
  const allowed = useCan()
  const actions = ACTIONS.filter((action) => allowed(action.permission))
  if (actions.length === 0) return null

  return (
    <nav aria-label="Quick actions" className="flex flex-wrap gap-3">
      {actions.map((action) => (
        <Button
          key={action.to}
          asChild
          size="lg"
          variant={action.primary ? 'default' : 'outline'}
          className={cn('h-11 px-4 text-[15px]', !action.primary && 'bg-card')}
        >
          <Link to={action.to}>
            <action.icon data-icon="inline-start" />
            {action.label}
          </Link>
        </Button>
      ))}
    </nav>
  )
}
