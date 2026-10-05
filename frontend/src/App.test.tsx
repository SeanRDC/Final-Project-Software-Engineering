import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import App from '@/App'
import { AuthContext, type AuthState } from '@/auth/authContext'
import { nurse } from '@/test/fixtures'

function renderApp(user: AuthState['user']) {
  const value: AuthState = { user, token: user ? 'abc' : null, login: vi.fn(), logout: vi.fn() }
  return render(
    <AuthContext value={value}>
      <App />
    </AuthContext>,
  )
}

test('asks a visitor to sign in', () => {
  renderApp(null)

  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
})

test('shows the application to a signed-in account', () => {
  renderApp(nurse)

  expect(screen.getByRole('heading', { name: 'HAU-Sync' })).toBeInTheDocument()
})
