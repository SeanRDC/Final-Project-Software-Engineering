import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'

import { FormCodeBox } from '@/components/FormCodeBox'

test('shows the code, revision and effectivity date of the form', () => {
  render(<FormCodeBox patientType="student" educationLevel="basic_education" />)

  const box = within(screen.getByRole('group', { name: 'Form code' }))
  expect(box.getByText('FM-SSA-MDS-8012')).toBeInTheDocument()
  expect(box.getByText('Revision: 0')).toBeInTheDocument()
  expect(box.getByText('Effectivity Date: May 1, 2025')).toBeInTheDocument()
})

test('changes its code with the kind of patient', () => {
  const { rerender } = render(<FormCodeBox patientType="student" educationLevel="college" />)
  expect(screen.getByText('FM-SSA-MDS-8013')).toBeInTheDocument()

  rerender(<FormCodeBox patientType="employee" educationLevel={null} />)
  expect(screen.getByText('FM-SSA-MDS-8011')).toBeInTheDocument()
})

test('shows a form code given outright, such as the medical kit forms', () => {
  render(<FormCodeBox code="FM-SSA-MDS-8033" />)
  expect(screen.getByText('FM-SSA-MDS-8033')).toBeInTheDocument()
  expect(screen.getByText('Revision: 0')).toBeInTheDocument()
})
