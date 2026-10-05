import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { api, ApiError, setAccessToken, setUnauthorizedHandler } from '@/api/client'

const fetchMock = vi.fn<typeof fetch>()

function respond(status: number, body?: unknown): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function lastCall(): { url: string; init: RequestInit; headers: Headers } {
  const [url, init] = fetchMock.mock.calls.at(-1)!
  return { url: String(url), init: init!, headers: new Headers(init!.headers) }
}

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  fetchMock.mockReset()
  setAccessToken(null)
  setUnauthorizedHandler(null)
  vi.unstubAllGlobals()
})

test('prefixes the api path, adds the query and returns the parsed body', async () => {
  fetchMock.mockResolvedValue(respond(200, { total: 2 }))

  const result = await api<{ total: number }>('/patients', {
    query: { q: 'santos', page: 1, x: '' },
  })

  expect(result).toEqual({ total: 2 })
  expect(lastCall().url).toBe('/api/v1/patients?q=santos&page=1')
})

test('sends the bearer token once it is set', async () => {
  fetchMock.mockResolvedValue(respond(200, {}))
  setAccessToken('abc123')

  await api('/auth/me')

  expect(lastCall().headers.get('Authorization')).toBe('Bearer abc123')
})

test('sends json bodies as json and form bodies url-encoded', async () => {
  fetchMock.mockResolvedValue(respond(200, {}))

  await api('/visits', { method: 'POST', json: { patient_id: 4 } })
  expect(lastCall().headers.get('Content-Type')).toBe('application/json')
  expect(lastCall().init.body).toBe('{"patient_id":4}')

  await api('/auth/login', { method: 'POST', form: { username: 'nurse', password: 'pw' } })
  expect(String(lastCall().init.body)).toBe('username=nurse&password=pw')
})

test('turns the backend detail message into an ApiError', async () => {
  fetchMock.mockResolvedValue(respond(409, { detail: 'The patient already has an open visit' }))

  const error = await api('/visits', { method: 'POST', json: {} }).catch((e: unknown) => e)

  expect(error).toBeInstanceOf(ApiError)
  expect(error).toMatchObject({ status: 409, message: 'The patient already has an open visit' })
})

test('summarises a validation error by its first field', async () => {
  fetchMock.mockResolvedValue(
    respond(422, { detail: [{ loc: ['body', 'complaint'], msg: 'Field required' }] }),
  )

  await expect(api('/visits', { method: 'POST', json: {} })).rejects.toThrow(
    'complaint: Field required',
  )
})

test('reports an unreachable server as a network error', async () => {
  fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))

  const error = await api('/dashboard').catch((e: unknown) => e)

  expect(error).toBeInstanceOf(ApiError)
  expect((error as ApiError).isNetworkError).toBe(true)
})

test('calls the unauthorized handler only when a token was sent', async () => {
  const handler = vi.fn()
  setUnauthorizedHandler(handler)
  fetchMock.mockResolvedValue(respond(401, { detail: 'Incorrect username or password' }))

  await api('/auth/login', { method: 'POST', form: {} }).catch(() => {})
  expect(handler).not.toHaveBeenCalled()

  setAccessToken('expired')
  await api('/dashboard').catch(() => {})
  expect(handler).toHaveBeenCalledOnce()
})

test('returns undefined for an empty 204 response', async () => {
  fetchMock.mockResolvedValue(respond(204))

  await expect(api('/locks/visit/3', { method: 'DELETE' })).resolves.toBeUndefined()
})
