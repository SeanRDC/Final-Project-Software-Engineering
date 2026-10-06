// Signs a station out when nobody has touched it for a while, so an unattended screen
// does not leave patient records open.

import { useEffect } from 'react'
import { toast } from 'sonner'

import { useAuth } from '@/auth/authContext'

/** How long a station may sit untouched. The clinic asked for an hour. */
export const IDLE_LIMIT_MS = 60 * 60 * 1000
/** How long before signing out the warning is shown. */
export const IDLE_WARNING_MS = 60 * 1000

const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const
const WARNING_TOAST = 'idle-warning'
const NOTICE_KEY = 'hau-sync.idle-sign-out'

/** True once after an idle sign-out, so the sign-in page can say why it is showing. */
export function takeIdleSignOutNotice(): boolean {
  try {
    const wasIdle = sessionStorage.getItem(NOTICE_KEY) !== null
    sessionStorage.removeItem(NOTICE_KEY)
    return wasIdle
  } catch {
    return false
  }
}

/** Use once, in the frame around the signed-in screens. */
export function useIdleLogout(limitMs = IDLE_LIMIT_MS, warningMs = IDLE_WARNING_MS): void {
  const { logout } = useAuth()

  useEffect(() => {
    let warnTimer: ReturnType<typeof setTimeout>
    let logoutTimer: ReturnType<typeof setTimeout>
    let lastReset = 0

    function signOut() {
      toast.dismiss(WARNING_TOAST)
      try {
        sessionStorage.setItem(NOTICE_KEY, '1')
      } catch {
        // Without storage the sign-in page simply shows no explanation.
      }
      logout()
    }

    function reset() {
      clearTimeout(warnTimer)
      clearTimeout(logoutTimer)
      toast.dismiss(WARNING_TOAST)
      warnTimer = setTimeout(() => {
        toast.warning('Signing out soon', {
          id: WARNING_TOAST,
          description:
            'This station has not been used for a while. Move the mouse to stay signed in.',
          duration: warningMs,
        })
      }, limitMs - warningMs)
      logoutTimer = setTimeout(signOut, limitMs)
    }

    function handleActivity() {
      // Mouse movement fires constantly; restarting the timers once a second is enough.
      const now = Date.now()
      if (now - lastReset < 1000) return
      lastReset = now
      reset()
    }

    reset()
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true })
    }
    return () => {
      clearTimeout(warnTimer)
      clearTimeout(logoutTimer)
      toast.dismiss(WARNING_TOAST)
      for (const event of ACTIVITY_EVENTS) window.removeEventListener(event, handleActivity)
    }
  }, [logout, limitMs, warningMs])
}
