import { afterEach, expect, test } from 'vitest'

import type { Token } from '@/api/types'
import { clearSession, loadSession, saveSession, sessionFromToken } from '@/auth/session'
import { nurse } from '@/test/fixtures'

const token: Token = { access_token: 'abc', token_type: 'bearer', expires_in: 3600, user: nurse }

afterEach(() => {
  sessionStorage.clear()
})

test('builds a session that expires when the token does', () => {
  const session = sessionFromToken(token, 1_000)

  expect(session).toEqual({ token: 'abc', expiresAt: 3_601_000, user: nurse })
})

test('restores a saved session', () => {
  saveSession(sessionFromToken(token, 1_000))

  expect(loadSession(2_000)?.user.username).toBe('nurse')
})

test('drops a session whose token has expired', () => {
  saveSession(sessionFromToken(token, 1_000))

  expect(loadSession(3_601_000)).toBeNull()
  expect(sessionStorage.length).toBe(0)
})

test('drops unreadable stored data', () => {
  sessionStorage.setItem('hau-sync.session', '{not json')

  expect(loadSession()).toBeNull()
  expect(sessionStorage.length).toBe(0)
})

test('clears the session on request', () => {
  saveSession(sessionFromToken(token))
  clearSession()

  expect(loadSession()).toBeNull()
})
