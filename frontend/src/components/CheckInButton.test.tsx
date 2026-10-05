import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { CheckInButton } from '@/components/CheckInButton'
import { appointment } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderButton() {
  return renderApp(
    <>
      <CheckInButton appointment={appointment()} />
      <Toaster />
    </>,
    { user: nurse },
  )
}

test('opens a visit for the appointment and confirms it', async () => {
  const server = fakeServer({ 'POST /appointments/3/check-in': { id: 21, status: 'open' } })
  const user = userEvent.setup()
  renderButton()

  await user.click(screen.getByRole('button', { name: 'Check in Panergo, Mark' }))

  expect(await screen.findByText('Panergo, Mark checked in')).toBeInTheDocument()
  expect(server.calls).toContain('POST /appointments/3/check-in')
})

test('shows why the server refused', async () => {
  const server = fakeServer()
  server.on(
    'POST /appointments/3/check-in',
    { detail: 'The patient already has an open visit' },
    409,
  )
  const user = userEvent.setup()
  renderButton()

  await user.click(screen.getByRole('button', { name: 'Check in Panergo, Mark' }))

  expect(await screen.findByText('The patient already has an open visit')).toBeInTheDocument()
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Check in Panergo, Mark' })).toBeEnabled(),
  )
})
