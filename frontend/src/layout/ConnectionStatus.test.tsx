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

test('shows the latency once it has been measured', () => {
  renderStatus({ status: 'connected', latencyMs: 3 })

  expect(screen.getByRole('status')).toHaveTextContent('Clinic server connected · 3 ms')
})

test('shows connected without a figure before the first measurement', () => {
  renderStatus({ status: 'connected', latencyMs: null })

  expect(screen.getByRole('status')).toHaveTextContent(/^Clinic server connected$/)
})

test('says so when the server cannot be reached', () => {
  renderStatus({ status: 'offline', latencyMs: null })

  expect(screen.getByRole('status')).toHaveTextContent('Clinic server offline · retrying')
})
