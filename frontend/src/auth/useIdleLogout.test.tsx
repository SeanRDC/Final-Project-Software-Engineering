import { act, fireEvent } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { IDLE_LIMIT_MS, takeIdleSignOutNotice, useIdleLogout } from '@/auth/useIdleLogout'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

const MINUTE = 60 * 1000

function Station() {
  useIdleLogout()
  return null
}

function renderStation() {
  const logout = vi.fn()
  renderApp(<Station />, { user: nurse, auth: { logout } })
  return logout
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  sessionStorage.clear()
})

test('signs the station out after an hour without activity', () => {
  const logout = renderStation()

  act(() => void vi.advanceTimersByTime(IDLE_LIMIT_MS - 1))
  expect(logout).not.toHaveBeenCalled()

  act(() => void vi.advanceTimersByTime(1))
  expect(logout).toHaveBeenCalledOnce()
  // The sign-in page is told why, once.
  expect(takeIdleSignOutNotice()).toBe(true)
  expect(takeIdleSignOutNotice()).toBe(false)
})

test('any use of the station starts the hour again', () => {
  const logout = renderStation()

  act(() => void vi.advanceTimersByTime(59 * MINUTE))
  fireEvent.keyDown(window, { key: 'a' })
  act(() => void vi.advanceTimersByTime(59 * MINUTE))
  expect(logout).not.toHaveBeenCalled()

  act(() => void vi.advanceTimersByTime(MINUTE))
  expect(logout).toHaveBeenCalledOnce()
})

test('leaving the signed-in screens stops the timer', () => {
  const logout = vi.fn()
  const { unmount } = renderApp(<Station />, { user: nurse, auth: { logout } })

  unmount()
  act(() => void vi.advanceTimersByTime(IDLE_LIMIT_MS))
  expect(logout).not.toHaveBeenCalled()
})
