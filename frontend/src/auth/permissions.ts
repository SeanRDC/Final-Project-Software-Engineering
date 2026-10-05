// What an account may do. The names mirror backend/app/core/permissions.py; the server
// is still the one that enforces them, the client only hides what would be refused.

import type { CurrentUser } from '@/api/types'
import { useAuth } from '@/auth/authContext'

export type Permission =
  | 'users:manage'
  | 'audit:view'
  | 'patients:read'
  | 'patients:write'
  | 'patients:archive'
  | 'visits:read'
  | 'visits:record'
  | 'visits:consult'
  | 'medicines:dispense'
  | 'appointments:read'
  | 'appointments:write'
  | 'appointments:decide'
  | 'inventory:read'
  | 'inventory:write'
  | 'reports:view'
  | 'reports:generate'
  | 'attachments:read'
  | 'attachments:write'
  | 'attachments:delete'

export function can(user: CurrentUser | null, permission: Permission | undefined): boolean {
  if (!user) return false
  if (!permission) return true
  return user.permissions.includes(permission)
}

/** Returns a checker for the signed-in account: `const allowed = useCan(); allowed('visits:record')`. */
export function useCan(): (permission: Permission | undefined) => boolean {
  const { user } = useAuth()
  return (permission) => can(user, permission)
}
