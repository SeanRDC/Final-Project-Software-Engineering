import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { User } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { MIN_PASSWORD_LENGTH, passwordProblem } from '@/lib/password'
import { useResetPassword } from '@/pages/users/useUsers'

function ResetForm({ account, onClose }: { account: User; onClose: () => void }) {
  const reset = useResetPassword(account.id)
  const [password, setPassword] = useState('')
  const [problem, setProblem] = useState<string | undefined>()

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = passwordProblem(password)
    setProblem(found)
    if (found) {
      document.getElementById('reset-password')?.focus()
      return
    }
    reset.mutate(password, {
      onSuccess: () => {
        toast.success(`Password reset for ${account.full_name}`, {
          description: 'They must choose their own password at their next sign-in.',
        })
        onClose()
      },
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate aria-label="Reset password">
      <FieldGroup>
        <Field data-invalid={problem ? true : undefined}>
          <FieldLabel htmlFor="reset-password">Temporary password</FieldLabel>
          <Input
            id="reset-password"
            name="new_password"
            type="text"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            required
            aria-invalid={problem ? true : undefined}
            aria-describedby={problem ? 'reset-password-error' : 'reset-password-hint'}
            value={password}
            onChange={(event) => {
              setPassword(event.target.value)
              setProblem(undefined)
            }}
          />
          {problem ? (
            <FieldError id="reset-password-error">{problem}</FieldError>
          ) : (
            <FieldDescription id="reset-password-hint">
              At least {MIN_PASSWORD_LENGTH} characters. Give it to {account.full_name} in person.
            </FieldDescription>
          )}
        </Field>

        {reset.error ? (
          <p role="alert" className="text-sm text-danger">
            {reset.error instanceof ApiError
              ? reset.error.message
              : 'Something went wrong. Please try again.'}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={reset.isPending} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={reset.isPending}>
            {reset.isPending ? <Spinner data-icon="inline-start" /> : null}
            Reset password
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}

type ResetPasswordDialogProps = {
  /** The account whose password is being reset, or null when the dialog is closed. */
  account: User | null
  onClose: () => void
}

/** Sets a temporary password for someone who has forgotten theirs. */
export function ResetPasswordDialog({ account, onClose }: ResetPasswordDialogProps) {
  return (
    <Dialog open={account !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {account ? `Reset password · ${account.full_name}` : 'Reset password'}
          </DialogTitle>
          <DialogDescription>
            Their current password stops working as soon as you save.
          </DialogDescription>
        </DialogHeader>
        {account ? <ResetForm key={account.id} account={account} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}
