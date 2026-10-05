import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { SectionCard } from '@/components/SectionCard'

test('renders a labelled region with its title, action and content', () => {
  render(
    <SectionCard title="Notifications" action={<a href="/notifications">View all</a>}>
      <p>Low stock: Mefenamic Acid</p>
    </SectionCard>,
  )

  expect(screen.getByRole('region', { name: 'Notifications' })).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Notifications' })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'View all' })).toBeInTheDocument()
  expect(screen.getByText('Low stock: Mefenamic Acid')).toBeInTheDocument()
})
