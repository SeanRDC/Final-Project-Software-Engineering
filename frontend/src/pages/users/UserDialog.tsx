import { useState, type FormEvent } from 'react'
import { toast } from 'sonner'

import { ApiError } from '@/api/client'
import type { Role, User } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { MIN_PASSWORD_LENGTH, passwordProblem } from '@/lib/password'
import { ROLES, useCreateUser, useUpdateUser } from '@/pages/users/useUsers'

type Values = {
  username: string
  full_name: string
  role: Role
  job_title: string
  password: string
  is_active: boolean
}

type Errors = Partial<Record<keyof Values, string>>

function validate(values: Values, isNew: boolean): Errors {
  const errors: Errors = {}
  if (isNew) {
    const username = values.username.trim()
    if (username.length < 3) errors.username = 'Use at least 3 characters.'
    else if (username.length > 50) errors.username = 'Use 50 characters or fewer.'
    else if (!/^[A-Za-z0-9._-]+$/.test(username)) {
      errors.username = 'Use letters, numbers, dots, dashes and underscores only.'
    }
  }
  if (!values.full_name.trim()) errors.full_name = 'Enter the person’s name.'
  if (isNew) {
    const problem = passwordProblem(values.password)
    if (problem) errors.password = problem
  }
  return errors
}

type FormProps = {
  /** The account to edit, or null to create one. */
  account: User | null
  /** True when the account being edited is the one signed in. */
  isSelf: boolean
  onClose: () => void
}

function UserForm({ account, isSelf, onClose }: FormProps) {
  const isNew = account === null
  const create = useCreateUser()
  const update = useUpdateUser(account?.id ?? 0)
  const [values, setValues] = useState<Values>({
    username: account?.username ?? '',
    full_name: account?.full_name ?? '',
    role: account?.role ?? 'clinic_staff',
    job_title: account?.job_title ?? '',
    password: '',
    is_active: account?.is_active ?? true,
  })
  const [errors, setErrors] = useState<Errors>({})
  const isSaving = create.isPending || update.isPending
  const error = create.error ?? update.error

  function change(patch: Partial<Values>) {
    const next = { ...values, ...patch }
    setValues(next)
    if (Object.keys(errors).length > 0) setErrors(validate(next, isNew))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate(values, isNew)
    setErrors(found)
    const firstInvalid = Object.keys(found)[0]
    if (firstInvalid) {
      document.getElementById(`account-${firstInvalid}`)?.focus()
      return
    }
    const shared = {
      full_name: values.full_name.trim(),
      role: values.role,
      job_title: values.job_title.trim() || null,
    }
    if (isNew) {
      create.mutate(
        { ...shared, username: values.username.trim(), password: values.password },
        {
          onSuccess: (saved) => {
            toast.success(`Account created for ${saved.full_name}`, {
              description: 'They will be asked to choose their own password at first sign-in.',
            })
            onClose()
          },
        },
      )
    } else {
      update.mutate(
        { ...shared, is_active: values.is_active },
        {
          onSuccess: (saved) => {
            toast.success(`Account updated for ${saved.full_name}`)
            onClose()
          },
        },
      )
    }
  }

  function invalid(name: keyof Values) {
    return {
      'aria-invalid': errors[name] ? (true as const) : undefined,
      'aria-describedby': errors[name] ? `account-${name}-error` : undefined,
    }
  }

  const role = ROLES.find((option) => option.value === values.role)

  return (
    <form onSubmit={handleSubmit} noValidate aria-label={isNew ? 'New account' : 'Edit account'}>
      <FieldGroup>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field data-invalid={errors.full_name ? true : undefined}>
            <FieldLabel htmlFor="account-full_name">Name</FieldLabel>
            <Input
              id="account-full_name"
              name="full_name"
              autoComplete="off"
              placeholder="Last name, First name…"
              maxLength={120}
              required
              {...invalid('full_name')}
              value={values.full_name}
              onChange={(event) => change({ full_name: event.target.value })}
            />
            {errors.full_name ? (
              <FieldError id="account-full_name-error">{errors.full_name}</FieldError>
            ) : null}
          </Field>

          <Field data-invalid={errors.username ? true : undefined}>
            <FieldLabel htmlFor="account-username">Username</FieldLabel>
            <Input
              id="account-username"
              name="username"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              required
              disabled={!isNew}
              {...invalid('username')}
              value={values.username}
              onChange={(event) => change({ username: event.target.value })}
            />
            {errors.username ? (
              <FieldError id="account-username-error">{errors.username}</FieldError>
            ) : isNew ? null : (
              <FieldDescription>A username cannot be changed.</FieldDescription>
            )}
          </Field>

          <Field>
            <FieldLabel htmlFor="account-role">Role</FieldLabel>
            <NativeSelect
              id="account-role"
              name="role"
              value={values.role}
              onChange={(event) => change({ role: event.target.value as Role })}
            >
              {ROLES.map((option) => (
                <NativeSelectOption key={option.value} value={option.value}>
                  {option.label}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {role ? <FieldDescription>{role.description}</FieldDescription> : null}
          </Field>

          <Field>
            <FieldLabel htmlFor="account-job_title">Job title (optional)</FieldLabel>
            <Input
              id="account-job_title"
              name="job_title"
              autoComplete="off"
              placeholder="e.g. Nurse, Student Assistant…"
              maxLength={80}
              value={values.job_title}
              onChange={(event) => change({ job_title: event.target.value })}
            />
          </Field>
        </div>

        {isNew ? (
          <Field data-invalid={errors.password ? true : undefined}>
            <FieldLabel htmlFor="account-password">Temporary password</FieldLabel>
            <Input
              id="account-password"
              name="password"
              type="text"
              autoComplete="off"
              spellCheck={false}
              required
              aria-invalid={errors.password ? true : undefined}
              aria-describedby={
                errors.password ? 'account-password-error' : 'account-password-hint'
              }
              value={values.password}
              onChange={(event) => change({ password: event.target.value })}
            />
            {errors.password ? (
              <FieldError id="account-password-error">{errors.password}</FieldError>
            ) : (
              <FieldDescription id="account-password-hint">
                At least {MIN_PASSWORD_LENGTH} characters. Give it to the person; they must change
                it when they first sign in.
              </FieldDescription>
            )}
          </Field>
        ) : (
          <Field orientation="horizontal">
            <Checkbox
              id="account-is_active"
              checked={values.is_active}
              disabled={isSelf}
              onCheckedChange={(state) => change({ is_active: state === true })}
            />
            <FieldLabel htmlFor="account-is_active" className="font-normal">
              Active (can sign in){isSelf ? ' — you cannot deactivate your own account' : ''}
            </FieldLabel>
          </Field>
        )}

        {error ? (
          <p role="alert" className="text-sm text-danger">
            {error instanceof ApiError ? error.message : 'Something went wrong. Please try again.'}
          </p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isSaving} onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSaving}>
            {isSaving ? <Spinner data-icon="inline-start" /> : null}
            {isNew ? 'Create account' : 'Save changes'}
          </Button>
        </DialogFooter>
      </FieldGroup>
    </form>
  )
}

type UserDialogProps = FormProps & { open: boolean }

/** Creates a clinic account or edits one's name, role, job title and whether it is active. */
export function UserDialog({ open, account, isSelf, onClose }: UserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{account ? `Edit ${account.full_name}` : 'New account'}</DialogTitle>
          <DialogDescription>
            {account
              ? 'Deactivate an account instead of deleting it: its past entries keep the person’s name.'
              : 'Each person at the clinic signs in with their own account.'}
          </DialogDescription>
        </DialogHeader>
        {open ? (
          <UserForm
            key={account?.id ?? 'new'}
            account={account}
            isSelf={isSelf}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
