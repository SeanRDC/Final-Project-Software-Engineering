import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { ConnectionStatus } from '@/layout/ConnectionStatus'
import { LiveContext, type LiveState } from '@/live/liveContext'

function renderStatus(state: LiveState) {
  return render(
    <LiveContext value={state}>
      <ConnectionStatus />
    </LiveContext>,
  )
}

test('is only a dot, with the state named for screen readers', () => {
  renderStatus({ status: 'connected', latencyMs: 3 })

  expect(screen.getByRole('status')).toHaveTextContent(/^Clinic server connected$/)
  expect(screen.getByRole('status')).toHaveClass('sr-only')
})

test('the details on hover include the response time once it has been measured', () => {
  renderStatus({ status: 'connected', latencyMs: 3 })

  const details = screen.getByRole('tooltip', { hidden: true })
  expect(details).toHaveTextContent('Clinic server connected')
  expect(details).toHaveTextContent('Response time 3 ms')
  // The dot's button points at them, so keyboard focus reads them too.
  expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', details.id)
})

test('leaves the response time out before the first measurement', () => {
  renderStatus({ status: 'connected', latencyMs: null })

  expect(screen.getByRole('tooltip', { hidden: true })).not.toHaveTextContent('Response time')
})

test('says so when the server cannot be reached', () => {
  renderStatus({ status: 'offline', latencyMs: null })

  expect(screen.getByRole('status')).toHaveTextContent('Clinic server offline · retrying')
  expect(screen.getByRole('tooltip', { hidden: true })).toHaveTextContent(
    'will not appear until the connection returns',
  )
})
