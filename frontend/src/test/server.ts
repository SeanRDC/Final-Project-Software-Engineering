// A stand-in for the backend in tests: answers fetch() from a table of routes.

import { vi } from 'vitest'

type Handler = unknown | ((request: { url: URL; init: RequestInit }) => unknown)

export type FakeServer = {
  /** Every request made so far, as "METHOD /path". */
  calls: string[]
  /** Adds or replaces the answer for one route, e.g. "GET /dashboard". */
  on: (route: string, handler: Handler, status?: number) => void
}

/**
 * Replaces fetch for the current test. Routes are "METHOD /path" below /api/v1.
 * A route with no answer responds 404 with a detail message, like the real API.
 * Call vi.unstubAllGlobals() in afterEach.
 */
export function fakeServer(routes: Record<string, Handler> = {}): FakeServer {
  const table = new Map<string, { handler: Handler; status: number }>()
  const calls: string[] = []

  const on: FakeServer['on'] = (route, handler, status = 200) => {
    table.set(route, { handler, status })
  }
  for (const [route, handler] of Object.entries(routes)) on(route, handler)

  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL, init: RequestInit = {}) => {
      const url = new URL(String(input), 'http://clinic.test')
      const route = `${init.method ?? 'GET'} ${url.pathname.replace('/api/v1', '')}`
      calls.push(route)

      const match = table.get(route)
      if (!match) {
        return Promise.resolve(
          new Response(JSON.stringify({ detail: `No test answer for ${route}` }), { status: 404 }),
        )
      }
      const body =
        typeof match.handler === 'function'
          ? (match.handler as (request: { url: URL; init: RequestInit }) => unknown)({ url, init })
          : match.handler
      // A 204 has no body; giving it one makes the Response constructor throw.
      const content = match.status === 204 ? null : JSON.stringify(body)
      return Promise.resolve(new Response(content, { status: match.status }))
    }),
  )

  return { calls, on }
}
