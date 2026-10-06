import { createContext, useContext } from 'react'

import type { CurrentUser } from '@/api/types'

export type AuthState = {
  /** The signed-in account, or null when nobody is signed in. */
  user: CurrentUser | null
  token: string | null
  /** Rejects with an ApiError carrying the server's message. */
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  /** Replaces the signed-in account's details, e.g. after it changed its password. */
  updateUser: (user: CurrentUser) => void
}

export const AuthContext = createContext<AuthState | null>(null)

export function useAuth(): AuthState {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}
