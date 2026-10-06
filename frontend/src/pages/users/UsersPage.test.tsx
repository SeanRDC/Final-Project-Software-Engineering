import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import type { CurrentUser, User } from '@/api/types'
import { Toaster } from '@/components/ui/sonner'
import { UsersPage } from '@/pages/users/UsersPage'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer, type FakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const coordinator: CurrentUser = {
  ...nurse,
  id: 1,
  username: 'coordinator',
  full_name: 'Salazar, CJ',
  role: 'coordinator',
  job_title: 'Clinic Coordinator',
  permissions: [...nurse.permissions, 'users:manage'],
}

function account(overrides: Partial<User>): User {
  return {
    id: 2,
    username: 'nurse',
    full_name: 'Reyes, Ana',
    role: 'clinic_staff',
    job_title: 'Nurse',
    is_active: true,
    must_change_password: false,
    created_at: '2026-10-01T00:00:00Z',
    last_login_at: '2026-10-04T01:00:00+00:00',
    ...overrides,
  }
}

const accounts = [
  account({
    id: 1,
    username: 'coordinator',
    full_name: 'Salazar, CJ',
    role: 'coordinator',
    job_title: 'Clinic Coordinator',
  }),
  account({}),
  account({
    id: 5,
    username: 'intern',
    full_name: 'Cruz, Ben',
    job_title: null,
    must_change_password: true,
    last_login_at: null,
  }),
  account({
    id: 6,
    username: 'old.doctor',
    full_name: 'Dr. Ramos',
    role: 'doctor',
    is_active: false,
  }),
]

function clinic(): FakeServer {
  return fakeServer({ 'GET /users': accounts })
}

function renderPage() {
  return renderApp(
    <>
      <UsersPage />
      <Toaster />
    </>,
    { user: coordinator },
  )
}

function row(name: string): HTMLElement {
  return screen.getByText(name).closest('tr')!
}

test('lists accounts with role, status and last sign-in', async () => {
  clinic()
  renderPage()

  await screen.findByText('Reyes, Ana')
  expect(screen.getByText('3 active of 4 accounts')).toBeInTheDocument()
  expect(row('Salazar, CJ')).toHaveTextContent('(you)')
  expect(row('Salazar, CJ')).toHaveTextContent('Clinic Coordinator')
  expect(row('Reyes, Ana')).toHaveTextContent('Clinic staff')
  expect(row('Reyes, Ana')).toHaveTextContent('Active')
  expect(row('Cruz, Ben')).toHaveTextContent('Temporary password')
  expect(row('Cruz, Ben')).toHaveTextContent('Never')
  expect(row('Dr. Ramos')).toHaveTextContent('Deactivated')
})

test('creates an account with a temporary password', async () => {
  const server = clinic()
  let sent: unknown
  server.on(
    'POST /users',
    ({ init }: { init: RequestInit }) => {
      sent = JSON.parse(String(init.body))
      return account({
        id: 9,
        username: 'm.santos',
        full_name: 'Santos, Mia',
        must_change_password: true,
      })
    },
    201,
  )
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'New account' }))
  const form = within(await screen.findByRole('form', { name: 'New account' }))

  await user.type(form.getByLabelText('Username'), 'm santos')
  await user.type(form.getByLabelText('Temporary password'), 'short')
  await user.click(form.getByRole('button', { name: 'Create account' }))
  expect(
    form.getByText('Use letters, numbers, dots, dashes and underscores only.'),
  ).toBeInTheDocument()
  expect(form.getByText('Enter the person’s name.')).toBeInTheDocument()
  expect(form.getByText('Use at least 8 characters.')).toBeInTheDocument()
  expect(server.calls).not.toContain('POST /users')

  await user.clear(form.getByLabelText('Username'))
  await user.type(form.getByLabelText('Username'), 'm.santos')
  await user.type(form.getByLabelText('Name'), 'Santos, Mia')
  await user.selectOptions(form.getByLabelText('Role'), 'Doctor')
  await user.clear(form.getByLabelText('Temporary password'))
  await user.type(form.getByLabelText('Temporary password'), 'welcome-2026')
  await user.click(form.getByRole('button', { name: 'Create account' }))

  expect(await screen.findByText('Account created for Santos, Mia')).toBeInTheDocument()
  expect(sent).toEqual({
    username: 'm.santos',
    full_name: 'Santos, Mia',
    role: 'doctor',
    job_title: null,
    password: 'welcome-2026',
  })
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
})

test('edits an account and can deactivate it, but not your own', async () => {
  const server = clinic()
  let sent: unknown
  server.on('PATCH /users/2', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return account({ is_active: false })
  })
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Edit Salazar, CJ' }))
  let form = within(await screen.findByRole('form', { name: 'Edit account' }))
  expect(form.getByLabelText('Username')).toBeDisabled()
  expect(form.getByRole('checkbox')).toBeDisabled()
  await user.click(form.getByRole('button', { name: 'Cancel' }))

  await user.click(screen.getByRole('button', { name: 'Edit Reyes, Ana' }))
  form = within(await screen.findByRole('form', { name: 'Edit account' }))
  await user.click(form.getByRole('checkbox'))
  await user.click(form.getByRole('button', { name: 'Save changes' }))

  expect(await screen.findByText('Account updated for Reyes, Ana')).toBeInTheDocument()
  expect(sent).toEqual({
    full_name: 'Reyes, Ana',
    role: 'clinic_staff',
    job_title: 'Nurse',
    is_active: false,
  })
})

test('shows the server’s reason when a change is refused', async () => {
  const server = clinic()
  server.on(
    'PATCH /users/2',
    { detail: 'The last active coordinator account cannot be demoted or deactivated' },
    400,
  )
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Edit Reyes, Ana' }))
  const form = within(await screen.findByRole('form', { name: 'Edit account' }))
  await user.click(form.getByRole('button', { name: 'Save changes' }))

  expect(await form.findByRole('alert')).toHaveTextContent('last active coordinator')
})

test('resets a password', async () => {
  const server = clinic()
  let sent: unknown
  server.on('POST /users/5/reset-password', ({ init }: { init: RequestInit }) => {
    sent = JSON.parse(String(init.body))
    return account({ id: 5, must_change_password: true })
  })
  const user = userEvent.setup()
  renderPage()

  await user.click(await screen.findByRole('button', { name: 'Reset password of Cruz, Ben' }))
  const form = within(await screen.findByRole('form', { name: 'Reset password' }))
  await user.click(form.getByRole('button', { name: 'Reset password' }))
  expect(form.getByText('Use at least 8 characters.')).toBeInTheDocument()

  await user.type(form.getByLabelText('Temporary password'), 'fresh-start-1')
  await user.click(form.getByRole('button', { name: 'Reset password' }))

  expect(await screen.findByText('Password reset for Cruz, Ben')).toBeInTheDocument()
  expect(sent).toEqual({ new_password: 'fresh-start-1' })
})
