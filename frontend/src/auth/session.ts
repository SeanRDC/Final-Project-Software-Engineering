// Keeps the signed-in session for the life of the browser tab.
// sessionStorage is used on purpose: the stations are shared, so closing the tab signs
// the person out and the token never outlives the browser session.

import type { CurrentUser, Token } from '@/api/types'

const STORAGE_KEY = 'hau-sync.session'

export type Session = {
  token: string
  /** Epoch milliseconds after which the server rejects the token. */
  expiresAt: number
  user: CurrentUser
}

export function sessionFromToken(response: Token, now: number = Date.now()): Session {
  return {
    token: response.access_token,
    expiresAt: now + response.expires_in * 1000,
    user: response.user,
  }
}

export function saveSession(session: Session): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function loadSession(now: number = Date.now()): Session | null {
  const raw = sessionStorage.getItem(STORAGE_KEY)
  if (!raw) return null
  try {
    const session = JSON.parse(raw) as Session
    if (typeof session.token !== 'string' || session.expiresAt <= now) {
      clearSession()
      return null
    }
    return session
  } catch {
    clearSession()
    return null
  }
}
