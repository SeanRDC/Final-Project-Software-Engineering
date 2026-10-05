import { ChevronDownIcon, CircleUserRoundIcon, LogOutIcon } from 'lucide-react'

import { useAuth } from '@/auth/authContext'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ROLE_LABELS: Record<string, string> = {
  coordinator: 'Clinic Coordinator',
  clinic_staff: 'Clinic Staff',
  doctor: 'Doctor',
}

/** The signed-in account at the right of the top bar, with the way to sign out. */
export function UserMenu() {
  const { user, logout } = useAuth()
  if (!user) return null

  const subtitle = user.job_title ?? ROLE_LABELS[user.role] ?? user.role

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-md py-1 pr-1 pl-2 text-right outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-muted">
        <CircleUserRoundIcon aria-hidden="true" className="size-5 text-foreground/80 sm:hidden" />
        <span className="flex min-w-0 flex-col leading-tight max-sm:sr-only">
          <span className="truncate text-sm font-medium">{user.full_name}</span>
          <span className="truncate text-xs text-muted-foreground">{subtitle}</span>
        </span>
        <ChevronDownIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-52">
        <DropdownMenuLabel className="flex flex-col gap-0.5">
          <span className="text-sm font-medium text-foreground">{user.full_name}</span>
          <span className="text-xs font-normal text-muted-foreground">
            Signed in as {user.username}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onSelect={logout}>
            <LogOutIcon />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
