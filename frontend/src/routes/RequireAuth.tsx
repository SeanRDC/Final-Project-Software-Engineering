import { Navigate, Outlet, useLocation } from 'react-router'

import { useAuth } from '@/auth/authContext'

/** Sends anyone who is not signed in to the login page and remembers where they were going. */
export function RequireAuth() {
  const { user } = useAuth()
  const location = useLocation()

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }
  return <Outlet />
}
