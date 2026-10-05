import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes, useLocation } from 'react-router'
import { expect, test } from 'vitest'

import { PatientSearch } from '@/layout/PatientSearch'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'

function Address() {
  const location = useLocation()
  return <p data-testid="address">{location.pathname + location.search}</p>
}

function renderSearch() {
  return renderApp(
    <>
      <PatientSearch />
      <Routes>
        <Route path="*" element={<Address />} />
      </Routes>
    </>,
    { user: nurse },
  )
}

test('opens the patient list with the search term', async () => {
  const user = userEvent.setup()
  renderSearch()

  await user.type(screen.getByRole('searchbox'), ' Santos, Maria {Enter}')

  expect(screen.getByTestId('address')).toHaveTextContent('/patients?q=Santos%2C%20Maria')
  expect(screen.getByRole('searchbox')).toHaveValue('')
})

test('does nothing for an empty search', async () => {
  const user = userEvent.setup()
  renderSearch()

  await user.type(screen.getByRole('searchbox'), '   {Enter}')

  expect(screen.getByTestId('address')).toHaveTextContent('/')
})

test('pressing slash moves focus to the search box', async () => {
  const user = userEvent.setup()
  renderSearch()

  expect(screen.getByRole('searchbox')).not.toHaveFocus()
  await user.keyboard('/')

  expect(screen.getByRole('searchbox')).toHaveFocus()
  expect(screen.getByRole('searchbox')).toHaveValue('')
})
