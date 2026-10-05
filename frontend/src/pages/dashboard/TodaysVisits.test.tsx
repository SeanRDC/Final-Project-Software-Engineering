import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'

import { TodaysVisits } from '@/pages/dashboard/TodaysVisits'
import { dashboard, patient, visit } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

test('lists the visits in the order the server sent them', () => {
  renderApp(<TodaysVisits visits={dashboard.todays_visits} />, { user: nurse })

  const section = screen.getByRole('region', { name: "Today's visits" })
  const names = within(section)
    .getAllByRole('article')
    .map((card) => card.getAttribute('aria-label'))

  expect(names).toEqual([
    'Santos, Maria, Open',
    'Mendoza, Carlo, In consultation',
    'Lim, Joseph, Completed',
  ])
  expect(within(section).getByRole('link', { name: 'Open full log' })).toHaveAttribute(
    'href',
    '/visits',
  )
})

test('says so when nobody has been checked in yet', () => {
  renderApp(<TodaysVisits visits={[]} />, { user: nurse })

  expect(screen.getByText('No visits yet today')).toBeInTheDocument()
  expect(screen.queryByRole('article')).not.toBeInTheDocument()
})

test('shows nine cards and points to the full log for the rest', () => {
  const many = Array.from({ length: 12 }, (_, index) =>
    visit({
      id: index + 1,
      patient: patient({ id: index + 1, full_name: `Patient ${index + 1}` }),
    }),
  )
  renderApp(<TodaysVisits visits={many} />, { user: nurse })

  expect(screen.getAllByRole('article')).toHaveLength(9)
  expect(screen.getByText(/3 more in the/)).toBeInTheDocument()
})
