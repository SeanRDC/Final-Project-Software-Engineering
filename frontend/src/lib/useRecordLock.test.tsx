import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { useRecordLock } from '@/lib/useRecordLock'
import { fakeServer } from '@/test/server'

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const LOCK = {
  resource_type: 'visit',
  resource_id: 14,
  locked_by_id: 2,
  locked_by_name: 'Reyes, Ana',
  locked_at: '2026-10-04T02:00:00+00:00',
  expires_at: '2026-10-04T02:05:00+00:00',
}

function Editor() {
  const lock = useRecordLock('visit', 14)
  return <p>{lock.state === 'refused' ? `refused: ${lock.message}` : lock.state}</p>
}

test('takes the lock, and releases it when editing ends', async () => {
  const server = fakeServer({ 'PUT /locks/visit/14': LOCK })
  server.on('DELETE /locks/visit/14', null, 204)
  const view = render(<Editor />)

  expect(screen.getByText('acquiring')).toBeInTheDocument()
  expect(await screen.findByText('held')).toBeInTheDocument()

  view.unmount()

  await waitFor(() =>
    expect(server.calls).toEqual(['PUT /locks/visit/14', 'DELETE /locks/visit/14']),
  )
})

test('renews the lock every minute while editing continues', async () => {
  vi.useFakeTimers({ shouldAdvanceTime: true })
  const server = fakeServer({ 'PUT /locks/visit/14': LOCK })
  render(<Editor />)
  await screen.findByText('held')

  await act(() => vi.advanceTimersByTimeAsync(60_000))
  await act(() => vi.advanceTimersByTimeAsync(60_000))

  expect(server.calls).toEqual([
    'PUT /locks/visit/14',
    'PUT /locks/visit/14',
    'PUT /locks/visit/14',
  ])
})

test('reports who is editing when the lock is refused, and releases nothing', async () => {
  const server = fakeServer()
  server.on(
    'PUT /locks/visit/14',
    { detail: 'This record is being edited by Dr. Villareal. Try again shortly.' },
    423,
  )
  const view = render(<Editor />)

  expect(
    await screen.findByText(
      'refused: This record is being edited by Dr. Villareal. Try again shortly.',
    ),
  ).toBeInTheDocument()

  view.unmount()

  expect(server.calls).toEqual(['PUT /locks/visit/14'])
})
