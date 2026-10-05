import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { ApiError } from '@/api/client'
import { AuthContext, type AuthState } from '@/auth/authContext'
import { LoginPage } from '@/pages/LoginPage'

function renderLogin(login: AuthState['login']) {
  const value: AuthState = { user: null, token: null, login, logout: vi.fn() }
  return render(
    <AuthContext value={value}>
      <LoginPage />
    </AuthContext>,
  )
}

test('keeps the button disabled until both fields are filled', async () => {
  const user = userEvent.setup()
  renderLogin(vi.fn())

  const button = screen.getByRole('button', { name: 'Sign in' })
  expect(button).toBeDisabled()

  await user.type(screen.getByLabelText('Username'), 'nurse')
  expect(button).toBeDisabled()

  await user.type(screen.getByLabelText('Password'), 'secret')
  expect(button).toBeEnabled()
})

test('submits the trimmed username and the password', async () => {
  const login = vi.fn<AuthState['login']>().mockResolvedValue()
  const user = userEvent.setup()
  renderLogin(login)

  await user.type(screen.getByLabelText('Username'), '  nurse ')
  await user.type(screen.getByLabelText('Password'), 'secret{Enter}')

  expect(login).toHaveBeenCalledWith('nurse', 'secret')
})

test('shows the message from the server when sign-in is rejected', async () => {
  const login = vi
    .fn<AuthState['login']>()
    .mockRejectedValue(new ApiError(401, 'Incorrect username or password'))
  const user = userEvent.setup()
  renderLogin(login)

  await user.type(screen.getByLabelText('Username'), 'nurse')
  await user.type(screen.getByLabelText('Password'), 'wrong{Enter}')

  expect(await screen.findByRole('alert')).toHaveTextContent('Incorrect username or password')
  expect(screen.getByRole('button', { name: 'Sign in' })).toBeEnabled()
})
