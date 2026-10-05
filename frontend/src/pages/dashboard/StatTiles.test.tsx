import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { StatTiles } from '@/pages/dashboard/StatTiles'
import { dashboard, medicine } from '@/test/dashboardFixture'

function tile(label: string): HTMLElement {
  return screen.getByText(label).parentElement!
}

test('shows the four counters with their detail lines', () => {
  render(<StatTiles stats={dashboard.stats} lowStock={dashboard.low_stock} />)

  expect(tile('Open visits')).toHaveTextContent('Open visits2' + '3 checked in today')
  expect(tile('Completed today')).toHaveTextContent('112 visits this month')
  expect(tile('Appointments today')).toHaveTextContent('32 still to come')
  expect(tile('Low-stock medicines')).toHaveTextContent('1Mefenamic Acid · 18 left')
})

test('counts the other low-stock medicines after the first', () => {
  const lowStock = [medicine(), medicine({ id: 6 }), medicine({ id: 7 })]
  render(<StatTiles stats={{ ...dashboard.stats, low_stock_items: 3 }} lowStock={lowStock} />)

  expect(tile('Low-stock medicines')).toHaveTextContent('Mefenamic Acid · 18 left, +2 more')
})

test('draws no alert when every medicine is above its threshold', () => {
  render(<StatTiles stats={{ ...dashboard.stats, low_stock_items: 0 }} lowStock={[]} />)

  expect(tile('Low-stock medicines')).toHaveTextContent('0All above threshold')
  expect(tile('Low-stock medicines')).not.toHaveClass('border-t-danger')
})

test('uses the singular for one visit this month', () => {
  render(<StatTiles stats={{ ...dashboard.stats, visits_this_month: 1 }} lowStock={[]} />)

  expect(tile('Completed today')).toHaveTextContent('1 visit this month')
})
