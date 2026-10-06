import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { ChangePasswordPage } from '@/pages/account/ChangePasswordPage'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderPage(options: Parameters<typeof renderApp>[1]) {
  return renderApp(
    <>
      <ChangePasswordPage />
      <Toaster />
    </>,
    options,
  )
}

async function fill(user: ReturnType<typeof userEvent.setup>, values: [string, string, string]) {
  const form = within(screen.getByRole('form', { name: 'Change password' }))
  if (values[0]) await user.type(form.getByLabelText('Current password'), values[0])
  if (values[1]) await user.type(form.getByLabelText('New password'), values[1])
  if (values[2]) await user.type(form.getByLabelText('New password again'), values[2])
  await user.click(form.getByRole('button', { name: 'Change password' }))
}

test('changes the password and refreshes the account from the server', async () => {
  const server = fakeServer({ 'GET /auth/me': { ...nurse, must_change_password: false } })
  let sent: unknown
  server.on('POST /auth/change-password', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return { message: 'Password changed.' }
  })
  const updateUser = vi.fn()
  const user = userEvent.setup()
  renderPage({ user: { ...nurse, must_change_password: true }, auth: { updateUser } })

  expect(screen.getByText('Choose your own password to continue')).toBeInTheDocument()
  // A required change cannot be skipped.
  expect(screen.queryByRole('button', { name: 'Cancel' })).not.toBeInTheDocument()

  await fill(user, ['temp-pass-1', 'my-new-password', 'my-new-password'])

  expect(await screen.findByText('Password changed')).toBeInTheDocument()
  expect(sent).toEqual({ current_password: 'temp-pass-1', new_password: 'my-new-password' })
  expect(updateUser).toHaveBeenCalledWith(expect.objectContaining({ must_change_password: false }))
})

test('checks the new password before sending anything', async () => {
  const server = fakeServer()
  const user = userEvent.setup()
  renderPage({ user: nurse })

  await fill(user, ['old-password', 'short', 'different'])

  expect(screen.getByText('Use at least 8 characters.')).toBeInTheDocument()
  expect(screen.getByText('The two passwords do not match.')).toBeInTheDocument()
  expect(screen.getByLabelText('New password')).toHaveFocus()
  expect(server.calls).toEqual([])
})

test('refuses a new password equal to the current one', async () => {
  fakeServer()
  const user = userEvent.setup()
  renderPage({ user: nurse })

  await fill(user, ['same-password', 'same-password', 'same-password'])

  expect(screen.getByText('Choose a password different from the current one.')).toBeInTheDocument()
})

test('shows the server’s reason when the current password is wrong', async () => {
  const server = fakeServer()
  server.on('POST /auth/change-password', { detail: 'The current password is incorrect' }, 400)
  const user = userEvent.setup()
  renderPage({ user: nurse })

  await fill(user, ['wrong-password', 'my-new-password', 'my-new-password'])

  expect(await screen.findByText('The current password is incorrect')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Change password' })).toBeEnabled())
})
