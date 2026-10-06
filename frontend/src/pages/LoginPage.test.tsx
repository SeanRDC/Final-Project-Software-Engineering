import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { ApiError } from '@/api/client'
import { AuthContext, type AuthState } from '@/auth/authContext'
import { LoginPage } from '@/pages/LoginPage'

function renderLogin(login: AuthState['login']) {
  const value: AuthState = {
    user: null,
    token: null,
    login,
    logout: vi.fn(),
    updateUser: vi.fn(),
  }
  return render(
    <AuthContext value={value}>
      <LoginPage />
    </AuthContext>,
  )
}

test('points out a missing field instead of sending the request', async () => {
  const login = vi.fn<AuthState['login']>()
  const user = userEvent.setup()
  renderLogin(login)

  await user.click(screen.getByRole('button', { name: 'Sign in' }))

  expect(screen.getByText('Enter your username.')).toBeInTheDocument()
  expect(screen.getByLabelText('Username')).toHaveFocus()
  expect(screen.getByLabelText('Username')).toBeInvalid()

  await user.type(screen.getByLabelText('Username'), 'nurse{Enter}')

  expect(screen.queryByText('Enter your username.')).not.toBeInTheDocument()
  expect(screen.getByText('Enter your password.')).toBeInTheDocument()
  expect(screen.getByLabelText('Password')).toHaveFocus()
  expect(login).not.toHaveBeenCalled()
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
