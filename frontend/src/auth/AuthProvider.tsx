import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'

import { api, setAccessToken, setUnauthorizedHandler } from '@/api/client'
import type { Token } from '@/api/types'
import { AuthContext, type AuthState } from '@/auth/authContext'
import {
  clearSession,
  loadSession,
  saveSession,
  sessionFromToken,
  type Session,
} from '@/auth/session'

function restoreSession(): Session | null {
  const session = loadSession()
  // Set before the first render so the very first queries already carry the token.
  setAccessToken(session?.token ?? null)
  return session
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(restoreSession)

  const logout = useCallback(() => {
    setAccessToken(null)
    clearSession()
    setSession(null)
    // Cached patient data must not be visible to the next person at the station.
    queryClient.clear()
  }, [queryClient])

  const login = useCallback(async (username: string, password: string) => {
    const response = await api<Token>('/auth/login', {
      method: 'POST',
      form: { username, password },
    })
    const next = sessionFromToken(response)
    setAccessToken(next.token)
    saveSession(next)
    setSession(next)
  }, [])

  // An expired or revoked token ends the session wherever the 401 came from.
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const value = useMemo<AuthState>(
    () => ({ user: session?.user ?? null, token: session?.token ?? null, login, logout }),
    [session, login, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}
