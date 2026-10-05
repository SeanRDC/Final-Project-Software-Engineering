import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, test, vi } from 'vitest'

import { Pager } from '@/components/Pager'

test('summarises the records on the current page', () => {
  render(<Pager page={2} pageSize={20} total={53} noun="patients" onPageChange={vi.fn()} />)

  expect(screen.getByText('Showing 21–40 of 53 patients')).toBeInTheDocument()
  expect(screen.getByText('Page 2 of 3')).toBeInTheDocument()
})

test('moves to the next and previous page', async () => {
  const onPageChange = vi.fn()
  const user = userEvent.setup()
  render(<Pager page={2} pageSize={20} total={53} noun="patients" onPageChange={onPageChange} />)

  await user.click(screen.getByRole('button', { name: 'Next' }))
  await user.click(screen.getByRole('button', { name: 'Previous' }))

  expect(onPageChange.mock.calls).toEqual([[3], [1]])
})

test('stops at the first and last page', () => {
  const { rerender } = render(
    <Pager page={1} pageSize={20} total={53} noun="patients" onPageChange={vi.fn()} />,
  )
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

  rerender(<Pager page={3} pageSize={20} total={53} noun="patients" onPageChange={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()
  expect(screen.getByText('Showing 41–53 of 53 patients')).toBeInTheDocument()
})

test('shows no page buttons when everything fits on one page', () => {
  render(<Pager page={1} pageSize={20} total={7} noun="visits" onPageChange={vi.fn()} />)

  expect(screen.getByText('Showing 1–7 of 7 visits')).toBeInTheDocument()
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
})
