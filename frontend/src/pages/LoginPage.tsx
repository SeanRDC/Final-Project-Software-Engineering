import { CircleAlertIcon, LogInIcon } from 'lucide-react'
import { useRef, useState, type FormEvent } from 'react'

import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/authContext'
import { takeIdleSignOutNotice } from '@/auth/useIdleLogout'
import { BrandLockup } from '@/components/BrandMark'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong while signing in. Please try again.'
}

export function LoginPage() {
  const { login } = useAuth()
  const usernameRef = useRef<HTMLInputElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  // Set when the station signed itself out for being left unused.
  const [wasIdle] = useState(takeIdleSignOutNotice)
  // Missing fields are pointed out only after the first attempt to sign in.
  const [wasSubmitted, setWasSubmitted] = useState(false)

  const usernameMissing = wasSubmitted && !username.trim()
  const passwordMissing = wasSubmitted && !password

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setWasSubmitted(true)
    setError(null)
    if (!username.trim()) {
      usernameRef.current?.focus()
      return
    }
    if (!password) {
      passwordRef.current?.focus()
      return
    }
    setIsSubmitting(true)
    try {
      await login(username.trim(), password)
    } catch (caught) {
      setError(messageFor(caught))
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh flex-col border-t-[3px] border-primary bg-background">
      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <BrandLockup className="mb-6 justify-center" />

          <div className="rounded-lg border bg-card p-6 shadow-xs">
            <h1 className="text-xl font-semibold">Sign in</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Use the clinic account given to you by the Clinic Coordinator.
            </p>

            <form onSubmit={handleSubmit} className="mt-6" noValidate>
              <FieldGroup>
                {wasIdle && !error ? (
                  <Alert>
                    <CircleAlertIcon />
                    <AlertTitle>You were signed out</AlertTitle>
                    <AlertDescription>
                      This station was not used for an hour. Sign in again to continue.
                    </AlertDescription>
                  </Alert>
                ) : null}
                {error ? (
                  <Alert variant="destructive">
                    <CircleAlertIcon />
                    <AlertTitle>Could not sign in</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <Field data-invalid={usernameMissing || undefined}>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    ref={usernameRef}
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    required
                    aria-invalid={usernameMissing || undefined}
                    aria-describedby={usernameMissing ? 'username-error' : undefined}
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                  {usernameMissing ? (
                    <FieldError id="username-error">Enter your username.</FieldError>
                  ) : null}
                </Field>

                <Field data-invalid={passwordMissing || undefined}>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    ref={passwordRef}
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    aria-invalid={passwordMissing || undefined}
                    aria-describedby={passwordMissing ? 'password-error' : undefined}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  {passwordMissing ? (
                    <FieldError id="password-error">Enter your password.</FieldError>
                  ) : null}
                </Field>

                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <LogInIcon data-icon="inline-start" />
                  )}
                  {isSubmitting ? 'Signing in…' : 'Sign in'}
                </Button>
              </FieldGroup>
            </form>
          </div>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            For authorised clinic personnel only. Patient records are confidential under the Data
            Privacy Act of 2012.
          </p>
        </div>
      </main>
    </div>
  )
}
