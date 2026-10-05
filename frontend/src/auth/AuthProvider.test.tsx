import { QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import type { Token } from '@/api/types'
import { AuthProvider } from '@/auth/AuthProvider'
import { useAuth } from '@/auth/authContext'
import { saveSession, sessionFromToken } from '@/auth/session'
import { createQueryClient } from '@/lib/queryClient'
import { nurse } from '@/test/fixtures'

const token: Token = { access_token: 'abc', token_type: 'bearer', expires_in: 3600, user: nurse }
const fetchMock = vi.fn<typeof fetch>()

function Probe() {
  const { user, login, logout } = useAuth()
  return (
    <div>
      <p>{user ? `Signed in as ${user.full_name}` : 'Signed out'}</p>
      <button onClick={() => void login('nurse', 'pw')}>Log in</button>
      <button onClick={logout}>Log out</button>
    </div>
  )
}

function renderProbe() {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <Probe />
      </AuthProvider>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  sessionStorage.clear()
  vi.unstubAllGlobals()
})

test('starts signed out', () => {
  renderProbe()

  expect(screen.getByText('Signed out')).toBeInTheDocument()
})

test('signs in, remembers the session for the tab, and signs out', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify(token), { status: 200 }))
  const user = userEvent.setup()
  renderProbe()

  await user.click(screen.getByRole('button', { name: 'Log in' }))

  expect(await screen.findByText('Signed in as Reyes, Ana')).toBeInTheDocument()
  expect(sessionStorage.getItem('hau-sync.session')).toContain('"token":"abc"')

  await user.click(screen.getByRole('button', { name: 'Log out' }))

  expect(screen.getByText('Signed out')).toBeInTheDocument()
  expect(sessionStorage.length).toBe(0)
})

test('restores the session after a page reload', () => {
  saveSession(sessionFromToken(token))

  renderProbe()

  expect(screen.getByText('Signed in as Reyes, Ana')).toBeInTheDocument()
})
