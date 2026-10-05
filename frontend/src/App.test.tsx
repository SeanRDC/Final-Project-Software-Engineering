import { screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import App from '@/App'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

test('sends a visitor to the login page', () => {
  renderApp(<App />, { route: '/patients' })

  expect(screen.getByRole('heading', { name: 'Sign in' })).toBeInTheDocument()
})

test('takes a signed-in account away from the login page', () => {
  renderApp(<App />, { user: nurse, route: '/login' })

  expect(screen.queryByRole('heading', { name: 'Sign in' })).not.toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Clinic Main Menu' })).toBeInTheDocument()
})

test('opens a screen the account is allowed to use', () => {
  renderApp(<App />, { user: nurse, route: '/check-in' })

  expect(screen.getByRole('heading', { name: 'Check-in / Walk-in' })).toBeInTheDocument()
  expect(screen.getByText(/being built next/)).toBeInTheDocument()
})

test('refuses a screen outside the account’s role', () => {
  renderApp(<App />, { user: doctor, route: '/check-in' })

  expect(screen.getByText('Not available for your account')).toBeInTheDocument()
  expect(screen.queryByText(/being built next/)).not.toBeInTheDocument()
})

test('explains an unknown address', () => {
  renderApp(<App />, { user: nurse, route: '/nowhere' })

  expect(screen.getByText('Page not found')).toBeInTheDocument()
})
