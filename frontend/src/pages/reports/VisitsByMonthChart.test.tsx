import { render, screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'

import { fillMonths } from '@/pages/reports/months'
import { VisitsByMonthChart } from '@/pages/reports/VisitsByMonthChart'

test('adds the months without visits, across a new year', () => {
  expect(
    fillMonths([
      { label: '2026-11', count: 7 },
      { label: '2027-02', count: 3 },
    ]),
  ).toEqual([
    { label: '2026-11', count: 7 },
    { label: '2026-12', count: 0 },
    { label: '2027-01', count: 0 },
    { label: '2027-02', count: 3 },
  ])
})

test('lists every month of the trend for screen readers', () => {
  render(
    <VisitsByMonthChart
      items={[
        { label: '2026-08', count: 21 },
        { label: '2026-10', count: 12 },
      ]}
    />,
  )

  const chart = within(screen.getByRole('region', { name: 'Visits by month' }))
  expect(chart.getByRole('row', { name: 'August 2026 21' })).toBeInTheDocument()
  expect(chart.getByRole('row', { name: 'September 2026 0' })).toBeInTheDocument()
  expect(chart.getByRole('row', { name: 'October 2026 12' })).toBeInTheDocument()
})

test('draws nothing for a single month, which the visits total already states', () => {
  const { container } = render(<VisitsByMonthChart items={[{ label: '2026-10', count: 12 }]} />)

  expect(container).toBeEmptyDOMElement()
})
