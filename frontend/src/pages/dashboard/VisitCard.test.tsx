import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { VisitCard } from '@/pages/dashboard/VisitCard'
import { FIXTURE_NOW, patient, visit } from '@/test/dashboardFixture'

test('shows an open visit with how long it has been open', () => {
  render(<VisitCard visit={visit()} now={FIXTURE_NOW} />)

  const card = screen.getByRole('article', { name: 'Santos, Maria, Open' })
  expect(card).toHaveTextContent('20 yrs · Student')
  expect(card).toHaveTextContent('Difficulty breathing')
  expect(card).toHaveTextContent('Open for6 min')
  expect(card).toHaveTextContent('Consultation')
})

test('marks a visit the doctor has taken up', () => {
  render(
    <VisitCard visit={visit({ doctor_id: 4, doctor_name: 'Dr. Villareal' })} now={FIXTURE_NOW} />,
  )

  const card = screen.getByRole('article', { name: 'Santos, Maria, In consultation' })
  expect(card).toHaveTextContent('Dr. Villareal')
  expect(card).toHaveClass('border-primary')
})

test('shows how long a completed visit took', () => {
  render(
    <VisitCard
      visit={visit({
        status: 'completed',
        checked_in_at: '2026-10-04T00:10:00+00:00',
        completed_at: '2026-10-04T01:20:00+00:00',
      })}
      now={FIXTURE_NOW}
    />,
  )

  expect(screen.getByRole('article', { name: 'Santos, Maria, Completed' })).toHaveTextContent(
    'Visit took1 h 10 min',
  )
})

test('draws attention to a visit left open for a long time', () => {
  render(
    <VisitCard visit={visit({ checked_in_at: '2026-10-04T01:16:00+00:00' })} now={FIXTURE_NOW} />,
  )

  expect(screen.getByText('44 min').closest('span')).toHaveClass('text-danger')
})

test('leaves out the age when the record has no birth date', () => {
  render(
    <VisitCard
      visit={visit({ patient: patient({ age: null, patient_type: 'employee' }) })}
      now={FIXTURE_NOW}
    />,
  )

  expect(screen.getByText('Employee')).toBeInTheDocument()
})

test('shows a cancelled visit without a timer', () => {
  render(<VisitCard visit={visit({ status: 'cancelled' })} now={FIXTURE_NOW} />)

  const card = screen.getByRole('article', { name: 'Santos, Maria, Cancelled' })
  expect(card).toHaveTextContent('Not seen')
  expect(card).not.toHaveTextContent('min')
})
