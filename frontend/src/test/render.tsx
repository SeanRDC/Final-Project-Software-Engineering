// Renders a component the way the app does: inside the router, the query client and a
// signed-in (or signed-out) session.

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, type RenderResult } from '@testing-library/react'
import type { ReactElement } from 'react'
import { MemoryRouter } from 'react-router'
import { vi } from 'vitest'

import type { CurrentUser } from '@/api/types'
import { AuthContext, type AuthState } from '@/auth/authContext'

type Options = {
  /** The signed-in account. Leave out, or pass null, for a visitor. */
  user?: CurrentUser | null
  /** The address the app starts on. */
  route?: string
  auth?: Partial<AuthState>
}

export function renderApp(ui: ReactElement, options: Options = {}): RenderResult {
  const { user = null, route = '/', auth } = options
  const value: AuthState = {
    user,
    token: user ? 'test-token' : null,
    login: vi.fn(),
    logout: vi.fn(),
    updateUser: vi.fn(),
    ...auth,
  }
  // No retries and no caching between tests, so a failing request fails at once.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthContext value={value}>
        <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
      </AuthContext>
    </QueryClientProvider>,
  )
}
