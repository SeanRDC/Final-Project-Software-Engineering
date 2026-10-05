import { screen, within } from '@testing-library/react'
import { expect, test } from 'vitest'

import { QuickActions } from '@/pages/dashboard/QuickActions'
import { doctor, nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

function actionNames(): string[] {
  const nav = screen.getByRole('navigation', { name: 'Quick actions' })
  return within(nav)
    .getAllByRole('link')
    .map((link) => link.textContent ?? '')
}

test('gives the front desk all four shortcuts', () => {
  renderApp(<QuickActions />, { user: nurse })

  expect(actionNames()).toEqual([
    'Check in patient',
    'Register new patient',
    'New appointment',
    'Search patient',
  ])
  expect(screen.getByRole('link', { name: 'Check in patient' })).toHaveAttribute(
    'href',
    '/check-in',
  )
})

test('leaves out what the doctor cannot do', () => {
  renderApp(<QuickActions />, { user: doctor })

  expect(actionNames()).toEqual(['Register new patient', 'Search patient'])
})
