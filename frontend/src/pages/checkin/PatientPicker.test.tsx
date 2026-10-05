import { screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { PatientPicker } from '@/pages/checkin/PatientPicker'
import { patient } from '@/test/dashboardFixture'
import { nurse } from '@/test/fixtures'
import { renderApp } from '@/test/render'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.unstubAllGlobals()
})

const santos = patient()
const page = (items: unknown[], total = items.length) => ({ items, total, page: 1, page_size: 8 })

test('asks for at least two characters before searching', async () => {
  const server = fakeServer()
  const user = userEvent.setup()
  renderApp(<PatientPicker onSelect={vi.fn()} />, { user: nurse })

  await user.type(screen.getByRole('searchbox', { name: 'Find the patient' }), 's')

  expect(screen.getByText(/Type at least 2 characters/)).toBeInTheDocument()
  expect(server.calls).toEqual([])
})

test('lists the matches and hands back the one that is chosen', async () => {
  const server = fakeServer({
    'GET /patients': ({ url }: { url: URL }) =>
      url.searchParams.get('q') === 'san' ? page([santos]) : page([]),
  })
  const onSelect = vi.fn()
  const user = userEvent.setup()
  renderApp(<PatientPicker onSelect={onSelect} />, { user: nurse })

  await user.type(screen.getByRole('searchbox'), 'san')

  const list = await screen.findByRole('list', { name: 'Matching patients' })
  const match = within(list).getByRole('button', { name: /Santos, Maria/ })
  expect(match).toHaveTextContent('20 yrs · Student · School of Computing')
  expect(match).toHaveTextContent('20221187')

  await user.click(match)

  expect(onSelect).toHaveBeenCalledWith(santos)
  expect(server.calls.at(-1)).toBe('GET /patients')
})

test('says how many more records match than are shown', async () => {
  fakeServer({ 'GET /patients': page([santos], 23) })
  const user = userEvent.setup()
  renderApp(<PatientPicker onSelect={vi.fn()} />, { user: nurse })

  await user.type(screen.getByRole('searchbox'), 'san')

  expect(await screen.findByText(/Showing 1 of 23 matches/)).toBeInTheDocument()
})

test('offers to register the patient when nothing matches', async () => {
  fakeServer({ 'GET /patients': page([]) })
  const user = userEvent.setup()
  renderApp(<PatientPicker onSelect={vi.fn()} />, { user: nurse })

  await user.type(screen.getByRole('searchbox'), 'zzz')

  expect(await screen.findByText(/No patient record matches/)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: 'Register new patient' })).toHaveAttribute(
    'href',
    '/patients/new',
  )
})
