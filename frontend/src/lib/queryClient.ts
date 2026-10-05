import { QueryClient } from '@tanstack/react-query'

import { ApiError } from '@/api/client'

// A rejected request (4xx) will be rejected again, so only retry when the server
// could not be reached or failed on its side.
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (error instanceof ApiError && error.status >= 400 && error.status < 500) return false
  return failureCount < 2
}

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: shouldRetry,
        // Live events from the WebSocket tell us when data changed, so refetching on
        // every window focus would only add load on the clinic server.
        refetchOnWindowFocus: false,
        staleTime: 30_000,
      },
      mutations: { retry: false },
    },
  })
}
