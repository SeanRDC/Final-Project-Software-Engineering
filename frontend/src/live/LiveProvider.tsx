import { useEffect, useState, type ReactNode } from 'react'

import { useAuth } from '@/auth/authContext'
import { LiveContext, type LiveState } from '@/live/liveContext'
import { connectLive, liveUrl } from '@/live/liveSocket'

const NOT_CONNECTED: LiveState = { status: 'connecting', latencyMs: null }

/** Holds the live connection open for as long as someone is signed in. */
export function LiveProvider({ children }: { children: ReactNode }) {
  const { token } = useAuth()
  const [state, setState] = useState<LiveState>(NOT_CONNECTED)

  useEffect(() => {
    if (!token) return
    const disconnect = connectLive({
      url: liveUrl(token, window.location),
      onEvent: () => {},
      onStatus: (status, latencyMs) => setState({ status, latencyMs }),
    })
    return () => {
      disconnect()
      setState(NOT_CONNECTED)
    }
  }, [token])

  return <LiveContext value={state}>{children}</LiveContext>
}
