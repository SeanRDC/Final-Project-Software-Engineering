import { Navigate, useLocation } from 'react-router'

import { useAuth } from '@/auth/authContext'
import { LoginPage } from '@/pages/LoginPage'

function returnPath(state: unknown): string {
  if (typeof state === 'object' && state !== null && 'from' in state) {
    const { from } = state
    // Only follow paths inside the app, never an address supplied from outside.
    if (typeof from === 'string' && from.startsWith('/') && !from.startsWith('//')) return from
  }
  return '/'
}

/** The login page, or straight back into the app for someone already signed in. */
export function LoginRoute() {
  const { user } = useAuth()
  const location = useLocation()

  if (user) return <Navigate to={returnPath(location.state)} replace />
  return <LoginPage />
}
