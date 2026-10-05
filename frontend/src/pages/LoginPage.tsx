import { CircleAlertIcon, LogInIcon } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/authContext'
import { BrandLockup } from '@/components/BrandMark'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'

function messageFor(error: unknown): string {
  if (error instanceof ApiError) return error.message
  return 'Something went wrong while signing in. Please try again.'
}

export function LoginPage() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
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
                {error ? (
                  <Alert variant="destructive">
                    <CircleAlertIcon />
                    <AlertTitle>Could not sign in</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="username">Username</FieldLabel>
                  <Input
                    id="username"
                    name="username"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    required
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="password">Password</FieldLabel>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </Field>

                <Button type="submit" disabled={isSubmitting || !username.trim() || !password}>
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
