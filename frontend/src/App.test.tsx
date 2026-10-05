import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import App from '@/App'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

test('sends a visitor to the login page', () => {
  renderApp(<App />, { route: '/' })

  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
})

test('shows the application to a signed-in account', () => {
  renderApp(<App />, { user: nurse, route: '/' })

  expect(screen.getByRole('heading', { name: 'HAU-Sync' })).toBeInTheDocument()
})

test('takes a signed-in account away from the login page', () => {
  renderApp(<App />, { user: nurse, route: '/login' })

  expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'HAU-Sync' })).toBeInTheDocument()
})
