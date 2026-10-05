import { CheckIcon, MoreHorizontalIcon } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Appointment } from '@/api/types'
import { useCan } from '@/auth/permissions'
import { CheckInButton } from '@/components/CheckInButton'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Field, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { formatClock } from '@/lib/format'
import {
  useCancelAppointment,
  useConfirmAppointment,
  useMarkNoShow,
} from '@/pages/appointments/useAppointments'

function message(error: unknown): string {
  return error instanceof ApiError ? error.message : 'Please try again.'
}

type AppointmentActionsProps = {
  appointment: Appointment
  /** The clinic's current day, which decides whether check-in and no-show apply. */
  today: string
}

/**
 * What can be done with one appointment, by state and by role:
 * confirm (coordinator, pending), check in (front desk, confirmed, today),
 * reschedule (front desk, pending or confirmed), no-show (front desk, confirmed, today or earlier),
 * cancel (coordinator, pending or confirmed).
 */
export function AppointmentActions({ appointment, today }: AppointmentActionsProps) {
  const allowed = useCan()
  const confirm = useConfirmAppointment(appointment.id)
  const cancel = useCancelAppointment(appointment.id)
  const noShow = useMarkNoShow(appointment.id)
  const [isCancelOpen, setIsCancelOpen] = useState(false)
  const [reason, setReason] = useState('')

  const name = appointment.patient.full_name
  const isPending = appointment.status === 'pending'
  const isConfirmed = appointment.status === 'confirmed'
  const isOpen = isPending || isConfirmed

  const canConfirm = isPending && allowed('appointments:decide')
  const canCheckIn = isConfirmed && appointment.scheduled_date === today && allowed('visits:record')
  const canReschedule = isOpen && allowed('appointments:write')
  const canNoShow =
    isConfirmed && appointment.scheduled_date <= today && allowed('appointments:write')
  const canCancel = isOpen && allowed('appointments:decide')
  const hasMenu = canReschedule || canNoShow || canCancel

  if (!canConfirm && !canCheckIn && !hasMenu) return null

  function closeCancel() {
    setIsCancelOpen(false)
    setReason('')
    cancel.reset()
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {canConfirm ? (
        <Button
          variant="outline"
          size="sm"
          className="h-8 bg-card px-3 text-sm"
          disabled={confirm.isPending}
          aria-label={`Confirm appointment for ${name}`}
          onClick={() =>
            confirm.mutate(undefined, {
              onSuccess: () => toast.success(`Appointment confirmed for ${name}`),
              onError: (error) =>
                toast.error(`Could not confirm the appointment for ${name}`, {
                  description: message(error),
                }),
            })
          }
        >
          {confirm.isPending ? (
            <Spinner data-icon="inline-start" />
          ) : (
            <CheckIcon data-icon="inline-start" />
          )}
          Confirm
        </Button>
      ) : null}

      {canCheckIn ? <CheckInButton appointment={appointment} /> : null}

      {hasMenu ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={`More actions for ${name}`}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              {canReschedule ? (
                <DropdownMenuItem asChild>
                  <Link
                    to={`/appointments/${appointment.id}/edit?date=${appointment.scheduled_date}`}
                  >
                    Reschedule or edit
                  </Link>
                </DropdownMenuItem>
              ) : null}
              {canNoShow ? (
                <DropdownMenuItem
                  onSelect={() =>
                    noShow.mutate(undefined, {
                      onSuccess: () => toast.success(`${name} marked as a no-show`),
                      onError: (error) =>
                        toast.error(`Could not mark ${name} as a no-show`, {
                          description: message(error),
                        }),
                    })
                  }
                >
                  Mark as no-show
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuGroup>
            {canCancel ? (
              <>
                {canReschedule || canNoShow ? <DropdownMenuSeparator /> : null}
                <DropdownMenuGroup>
                  <DropdownMenuItem variant="destructive" onSelect={() => setIsCancelOpen(true)}>
                    Cancel appointment
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}

      <AlertDialog open={isCancelOpen} onOpenChange={(open) => !open && closeCancel()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel this appointment?</AlertDialogTitle>
            <AlertDialogDescription>
              {name}’s appointment at {formatClock(appointment.start_time)} will be cancelled. It
              stays in the records and cannot be reopened; a new one can be booked.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Field>
            <FieldLabel htmlFor={`cancel-appointment-${appointment.id}`}>
              Reason (optional)
            </FieldLabel>
            <Input
              id={`cancel-appointment-${appointment.id}`}
              name="reason"
              maxLength={255}
              autoComplete="off"
              placeholder="e.g. the patient asked to cancel…"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </Field>
          {cancel.error ? (
            <p role="alert" className="text-sm text-danger">
              {message(cancel.error)}
            </p>
          ) : null}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancel.isPending}>Keep appointment</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={cancel.isPending}
              onClick={() =>
                cancel.mutate(reason, {
                  onSuccess: () => {
                    toast.success(`Appointment cancelled for ${name}`)
                    closeCancel()
                  },
                })
              }
            >
              {cancel.isPending ? <Spinner data-icon="inline-start" /> : null}
              Cancel appointment
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
