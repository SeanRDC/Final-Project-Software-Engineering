import { CircleAlertIcon, UserPlusIcon } from 'lucide-react'
import { useState } from 'react'

import { ApiError } from '@/api/client'
import type { User } from '@/api/types'
import { useAuth } from '@/auth/authContext'
import { StatusPill, type StatusTone } from '@/components/StatusPill'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatTimeOfDay } from '@/lib/format'
import { cn } from '@/lib/utils'
import { ResetPasswordDialog } from '@/pages/users/ResetPasswordDialog'
import { UserDialog } from '@/pages/users/UserDialog'
import { roleLabel, useUsers } from '@/pages/users/useUsers'

const HEAD_CLASS = 'h-9 text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase'

function accountStatus(account: User): { label: string; tone: StatusTone } {
  if (!account.is_active) return { label: 'Deactivated', tone: 'neutral' }
  if (account.must_change_password) return { label: 'Temporary password', tone: 'warning' }
  return { label: 'Active', tone: 'success' }
}

function lastSeen(moment: string | null): string {
  if (!moment) return 'Never'
  const date = new Date(moment).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  return `${date}, ${formatTimeOfDay(moment)}`
}

/** Clinic accounts, for the coordinator: who can sign in and with which role. */
export function UsersPage() {
  const { user } = useAuth()
  const { data, error, isPending } = useUsers()
  // null = closed, 'new' = creating, an account = editing it.
  const [editing, setEditing] = useState<User | 'new' | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {data
            ? `${data.filter((account) => account.is_active).length} active of ${data.length} accounts`
            : ' '}
        </p>
        <Button size="lg" className="h-10 px-4" onClick={() => setEditing('new')}>
          <UserPlusIcon data-icon="inline-start" />
          New account
        </Button>
      </div>

      {error ? (
        <Alert variant="destructive">
          <CircleAlertIcon />
          <AlertTitle>The accounts could not be loaded</AlertTitle>
          <AlertDescription>
            {error instanceof ApiError ? error.message : 'Something went wrong.'}
          </AlertDescription>
        </Alert>
      ) : null}

      {isPending ? (
        <div role="status" aria-label="Loading accounts" className="flex flex-col gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : null}

      {data ? (
        <section aria-label="Accounts" className="overflow-hidden rounded-lg border bg-card">
          <Table>
            <TableHeader className="bg-muted/60">
              <TableRow className="hover:bg-transparent">
                <TableHead className={cn(HEAD_CLASS, 'pl-4')}>Name</TableHead>
                <TableHead className={HEAD_CLASS}>Username</TableHead>
                <TableHead className={HEAD_CLASS}>Role</TableHead>
                <TableHead className={HEAD_CLASS}>Status</TableHead>
                <TableHead className={HEAD_CLASS}>Last sign-in</TableHead>
                <TableHead className="pr-4">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((account) => {
                const status = accountStatus(account)
                return (
                  <TableRow key={account.id} className={cn(!account.is_active && 'opacity-70')}>
                    <TableCell className="py-3 pl-4">
                      <div className="text-[15px] font-medium">
                        {account.full_name}
                        {account.id === user?.id ? (
                          <span className="ml-2 text-[13px] font-normal text-muted-foreground">
                            (you)
                          </span>
                        ) : null}
                      </div>
                      {account.job_title ? (
                        <div className="text-[13px] text-muted-foreground">{account.job_title}</div>
                      ) : null}
                    </TableCell>
                    <TableCell className="py-3 text-sm">{account.username}</TableCell>
                    <TableCell className="py-3 text-sm">{roleLabel(account.role)}</TableCell>
                    <TableCell className="py-3">
                      <StatusPill tone={status.tone}>{status.label}</StatusPill>
                    </TableCell>
                    <TableCell className="py-3 text-sm whitespace-nowrap text-muted-foreground tabular-nums">
                      {lastSeen(account.last_login_at)}
                    </TableCell>
                    <TableCell className="py-3 pr-4">
                      <div className="flex justify-end gap-1.5">
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={`Reset password of ${account.full_name}`}
                          onClick={() => setResetting(account)}
                        >
                          Reset password
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-card"
                          aria-label={`Edit ${account.full_name}`}
                          onClick={() => setEditing(account)}
                        >
                          Edit
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </section>
      ) : null}

      <UserDialog
        open={editing !== null}
        account={editing === 'new' ? null : editing}
        isSelf={editing !== null && editing !== 'new' && editing.id === user?.id}
        onClose={() => setEditing(null)}
      />
      <ResetPasswordDialog account={resetting} onClose={() => setResetting(null)} />
    </div>
  )
}
