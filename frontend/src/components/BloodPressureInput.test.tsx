import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { expect, test } from 'vitest'

import { BloodPressureInput } from '@/components/BloodPressureInput'

function Harness({ error }: { error?: string }) {
  const [value, setValue] = useState('')
  return <BloodPressureInput id="bp" value={value} onChange={setValue} error={error} />
}

test('typing a space puts the slash between the two numbers', async () => {
  const user = userEvent.setup()
  render(<Harness />)

  const input = screen.getByLabelText('Blood pressure')
  await user.type(input, '120 80')

  expect(input).toHaveValue('120/80')
  expect(screen.getByText('mmHg')).toBeInTheDocument()
})

test('shows the error beneath the box', () => {
  render(<Harness error="Enter both numbers, e.g. 120/80." />)

  const input = screen.getByLabelText('Blood pressure')
  expect(input).toHaveAttribute('aria-invalid', 'true')
  expect(input).toHaveAccessibleDescription('Enter both numbers, e.g. 120/80.')
})
