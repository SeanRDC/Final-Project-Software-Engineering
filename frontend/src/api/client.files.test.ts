// File uploads and downloads through the API client.

import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api, apiDownload, setAccessToken } from '@/api/client'

const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  setAccessToken(null)
  vi.unstubAllGlobals()
})

function lastCall(): { init: RequestInit; headers: Headers } {
  const init = fetchMock.mock.calls.at(-1)![1]!
  return { init, headers: new Headers(init.headers) }
}

test('sends a file upload as multipart and lets the browser set the content type', async () => {
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: 1 }), { status: 201 }))
  const formData = new FormData()
  formData.append('file', new File(['x'], 'lab.pdf', { type: 'application/pdf' }))

  await api('/patients/1/attachments', { method: 'POST', formData })

  expect(lastCall().init.body).toBe(formData)
  expect(lastCall().headers.has('Content-Type')).toBe(false)
})

test('downloads a file with the token and the name the server gave it', async () => {
  setAccessToken('abc123')
  fetchMock.mockResolvedValue(
    new Response('a,b\n1,2\n', {
      status: 200,
      headers: { 'Content-Disposition': 'attachment; filename="clinic-report-3.csv"' },
    }),
  )

  const download = await apiDownload('/reports/3/csv', 'report.csv')

  expect(download.filename).toBe('clinic-report-3.csv')
  expect(await download.blob.text()).toBe('a,b\n1,2\n')
  expect(lastCall().headers.get('Authorization')).toBe('Bearer abc123')
})

test('falls back to the given name when the server sends none', async () => {
  fetchMock.mockResolvedValue(new Response('x', { status: 200 }))

  expect((await apiDownload('/attachments/4/download', 'scan.pdf')).filename).toBe('scan.pdf')
})

test('a refused download carries the server message', async () => {
  fetchMock.mockResolvedValue(
    new Response(JSON.stringify({ detail: 'Report not found' }), { status: 404 }),
  )

  await expect(apiDownload('/reports/9/csv', 'report.csv')).rejects.toThrow('Report not found')
})
