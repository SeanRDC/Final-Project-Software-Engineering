import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { StatusPill } from '@/components/StatusPill'

test('shows its label', () => {
  render(<StatusPill tone="success">Completed</StatusPill>)
  expect(screen.getByText('Completed')).toBeInTheDocument()
})

test('applies the colours of its tone', () => {
  render(<StatusPill tone="warning">Pending</StatusPill>)
  expect(screen.getByText('Pending')).toHaveClass('bg-warning-subtle', 'text-warning')
})

test('falls back to the neutral tone', () => {
  render(<StatusPill>Cancelled</StatusPill>)
  expect(screen.getByText('Cancelled')).toHaveClass('bg-muted')
})
