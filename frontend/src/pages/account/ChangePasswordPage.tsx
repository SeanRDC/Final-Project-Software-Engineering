import { useMutation } from '@tanstack/react-query'
import { CircleAlertIcon, KeyRoundIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'

import { api, ApiError } from '@/api/client'
import type { CurrentUser } from '@/api/types'
import { useAuth } from '@/auth/authContext'
import { SectionCard } from '@/components/SectionCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { MIN_PASSWORD_LENGTH, passwordProblem } from '@/lib/password'

type Errors = { current?: string; next?: string; confirm?: string }

/** Lets the signed-in account change its own password. Required after an account is created or reset. */
export function ChangePasswordPage() {
  const { user, updateUser } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<Errors>({})
  const isRequired = user?.must_change_password ?? false

  const change = useMutation({
    mutationFn: async () => {
      await api('/auth/change-password', {
        method: 'POST',
        json: { current_password: current, new_password: next },
      })
      // The server clears the "must change password" flag; fetch the account as it is now.
      return api<CurrentUser>('/auth/me')
    },
    onSuccess: (account) => {
      updateUser(account)
      toast.success('Password changed')
      void navigate('/')
    },
  })

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found: Errors = {}
    if (!current) found.current = 'Enter your current password.'
    const problem = passwordProblem(next)
    if (problem) found.next = problem
    else if (next === current) found.next = 'Choose a password different from the current one.'
    if (confirm !== next) found.confirm = 'The two passwords do not match.'
    setErrors(found)
    const firstInvalid = (['current', 'next', 'confirm'] as const).find((key) => found[key])
    if (firstInvalid) {
      document.getElementById(`password-${firstInvalid}`)?.focus()
      return
    }
    change.mutate()
  }

  return (
    <SectionCard title="Change password" className="mx-auto max-w-lg">
      <form onSubmit={handleSubmit} noValidate aria-label="Change password" className="p-4 md:p-6">
        <FieldGroup>
          {isRequired ? (
            <Alert>
              <KeyRoundIcon />
              <AlertTitle>Choose your own password to continue</AlertTitle>
              <AlertDescription>
                This account still has the password the Clinic Coordinator set for it. Change it
                before using the system.
              </AlertDescription>
            </Alert>
          ) : null}

          <Field data-invalid={errors.current ? true : undefined}>
            <FieldLabel htmlFor="password-current">Current password</FieldLabel>
            <Input
              id="password-current"
              name="current_password"
              type="password"
              autoComplete="current-password"
              required
              aria-invalid={errors.current ? true : undefined}
              aria-describedby={errors.current ? 'password-current-error' : undefined}
              value={current}
              onChange={(event) => setCurrent(event.target.value)}
            />
            {errors.current ? (
              <FieldError id="password-current-error">{errors.current}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={errors.next ? true : undefined}>
            <FieldLabel htmlFor="password-next">New password</FieldLabel>
            <Input
              id="password-next"
              name="new_password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={errors.next ? true : undefined}
              aria-describedby={errors.next ? 'password-next-error' : 'password-next-hint'}
              value={next}
              onChange={(event) => setNext(event.target.value)}
            />
            {errors.next ? (
              <FieldError id="password-next-error">{errors.next}</FieldError>
            ) : (
              <FieldDescription id="password-next-hint">
                At least {MIN_PASSWORD_LENGTH} characters.
              </FieldDescription>
            )}
          </Field>

          <Field data-invalid={errors.confirm ? true : undefined}>
            <FieldLabel htmlFor="password-confirm">New password again</FieldLabel>
            <Input
              id="password-confirm"
              name="confirm_password"
              type="password"
              autoComplete="new-password"
              required
              aria-invalid={errors.confirm ? true : undefined}
              aria-describedby={errors.confirm ? 'password-confirm-error' : undefined}
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
            />
            {errors.confirm ? (
              <FieldError id="password-confirm-error">{errors.confirm}</FieldError>
            ) : null}
          </Field>

          {change.error ? (
            <Alert variant="destructive">
              <CircleAlertIcon />
              <AlertTitle>The password was not changed</AlertTitle>
              <AlertDescription>
                {change.error instanceof ApiError
                  ? change.error.message
                  : 'Something went wrong. Please try again.'}
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end gap-2 border-t pt-4">
            {isRequired ? null : (
              <Button
                type="button"
                variant="outline"
                disabled={change.isPending}
                onClick={() => void navigate(-1)}
              >
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={change.isPending}>
              {change.isPending ? <Spinner data-icon="inline-start" /> : null}
              {change.isPending ? 'Changing…' : 'Change password'}
            </Button>
          </div>
        </FieldGroup>
      </form>
    </SectionCard>
  )
}
