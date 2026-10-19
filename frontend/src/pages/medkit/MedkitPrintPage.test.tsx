// The printable dispensary form (FM-SSA-MDS-8033) of an issued kit.

import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Route, Routes } from 'react-router'
import { afterEach, expect, test, vi } from 'vitest'

import { MedkitPrintPage } from '@/pages/medkit/MedkitPrintPage'
import { nurse } from '@/test/fixtures'
import { medkitRequest } from '@/test/medkitFixture'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const issued = medkitRequest({
  status: 'issued',
  medkit: { id: 3, kit_number: 3, label: 'Grey box' },
  issued_at: '2026-10-04T01:00:00+00:00',
  issued_by_name: 'Reyes, Ana',
  items: [
    {
      id: 31,
      medicine_id: 11,
      medicine_name: 'Loperamide 2 mg',
      unit: 'capsule',
      quantity_issued: 10,
      quantity_returned: null,
      quantity_used: null,
    },
  ],
})

function renderPrint() {
  return renderApp(
    <Routes>
      <Route path="/print/medkit/:requestId" element={<MedkitPrintPage />} />
    </Routes>,
    { user: nurse, route: '/print/medkit/2' },
  )
}

test('lays the issued kit out on the dispensary form', async () => {
  fakeServer({ 'GET /medkit-requests/2': issued })
  renderPrint()

  const form = within(await screen.findByRole('article', { name: 'Medical kit dispensary' }))
  expect(form.getByText('FM-SSA-MDS-8033')).toBeInTheDocument()
  expect(form.getByText('Medical Kit Dispensary')).toBeInTheDocument()
  expect(form.getByText('3')).toBeInTheDocument()
  expect(form.getByText('Junior Philippine Computer Society')).toBeInTheDocument()
  expect(form.getByRole('row', { name: 'Loperamide 2 mg 10 capsule' })).toBeInTheDocument()
  expect(form.getByText('Dela Cruz, Juan')).toBeInTheDocument()
  expect(form.getByText('Reyes, Ana')).toBeInTheDocument()
  expect(form.getByText(/return the Medical Kit/i)).toBeInTheDocument()
})

test('prints from the button', async () => {
  fakeServer({ 'GET /medkit-requests/2': issued })
  const print = vi.fn()
  vi.stubGlobal('print', print)
  const user = userEvent.setup()
  renderPrint()

  await user.click(await screen.findByRole('button', { name: 'Print' }))
  expect(print).toHaveBeenCalledOnce()
})
