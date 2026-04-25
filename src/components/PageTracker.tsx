'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'

// Self-hosted page tracker. POSTs page_view + heartbeat + session_end
// events to /api/track. The server identifies the visitor (logged-in
// user_id from cookie, or hashed anonymous visitor_id) and writes to
// public.user_events.
//
// Why heartbeats? They give us "active time on page" — the user is
// actually looking at the tab — instead of "tab open in background"
// which is meaningless.

const HEARTBEAT_INTERVAL_MS = 30_000
const SKIP_PATHS = ['/admin', '/api']  // don't track admin browsing or API calls

function shouldSkip(path: string): boolean {
  return SKIP_PATHS.some(p => path === p || path.startsWith(`${p}/`))
}

function getSessionId(): string {
  // Per-tab session: lives in sessionStorage so it resets on tab close
  // but persists across client-side navigations within the tab.
  try {
    let id = sessionStorage.getItem('fs_session_id')
    if (!id) {
      id = crypto.randomUUID()
      sessionStorage.setItem('fs_session_id', id)
    }
    return id
  } catch {
    // Private browsing / blocked storage: generate ephemeral id per page.
    return crypto.randomUUID()
  }
}

function send(payload: Record<string, unknown>, useBeacon = false): void {
  const body = JSON.stringify(payload)
  try {
    if (useBeacon && typeof navigator.sendBeacon === 'function') {
      // sendBeacon is the only reliable way to ship a request during
      // page unload. fetch() may be cancelled by the browser.
      const blob = new Blob([body], { type: 'application/json' })
      navigator.sendBeacon('/api/track', blob)
      return
    }
    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => { /* swallow — tracker should never break the app */ })
  } catch {
    // Same — never let this throw upward.
  }
}

// Public helper: fire a one-shot tracking event from anywhere in the app.
// Currently used to mark outbound article clicks as `page_view` events with
// a synthetic `outbound:<url>` path — no schema change needed, the existing
// page_view event_type covers it.
export function trackOutboundClick(url: string): void {
  if (typeof window === 'undefined') return
  let sessionId = ''
  try { sessionId = sessionStorage.getItem('fs_session_id') || '' } catch { /* ignore */ }
  if (!sessionId) sessionId = crypto.randomUUID()
  send({
    event_type: 'page_view',
    page_path: `outbound:${url}`.slice(0, 500),
    session_id: sessionId,
    referrer: typeof window !== 'undefined' ? window.location.pathname : null,
  }, /* useBeacon */ true)
}

export default function PageTracker() {
  const pathname = usePathname()
  // Tracks how much "visible time" the user has accrued on the current page.
  const visibleStartRef = useRef<number | null>(null)
  const accumulatedMsRef = useRef<number>(0)
  const sessionIdRef = useRef<string>('')
  const currentPathRef = useRef<string>('')

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!pathname || shouldSkip(pathname)) return

    sessionIdRef.current = getSessionId()
    currentPathRef.current = pathname
    accumulatedMsRef.current = 0
    visibleStartRef.current = document.visibilityState === 'visible' ? Date.now() : null

    // Initial page_view
    send({
      event_type: 'page_view',
      page_path: pathname,
      session_id: sessionIdRef.current,
      referrer: typeof document !== 'undefined' ? document.referrer || null : null,
    })

    const heartbeat = setInterval(() => {
      if (document.visibilityState !== 'visible') return
      send({
        event_type: 'heartbeat',
        page_path: currentPathRef.current,
        session_id: sessionIdRef.current,
      })
    }, HEARTBEAT_INTERVAL_MS)

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        // Accumulate time spent visible since last visible→hidden transition.
        if (visibleStartRef.current !== null) {
          accumulatedMsRef.current += Date.now() - visibleStartRef.current
          visibleStartRef.current = null
        }
        // Send a session_end snapshot now (use beacon — tab may be closing).
        send({
          event_type: 'session_end',
          page_path: currentPathRef.current,
          session_id: sessionIdRef.current,
          duration_ms: accumulatedMsRef.current,
        }, true)
      } else if (document.visibilityState === 'visible') {
        visibleStartRef.current = Date.now()
      }
    }

    const onBeforeUnload = () => {
      if (visibleStartRef.current !== null) {
        accumulatedMsRef.current += Date.now() - visibleStartRef.current
        visibleStartRef.current = null
      }
      send({
        event_type: 'session_end',
        page_path: currentPathRef.current,
        session_id: sessionIdRef.current,
        duration_ms: accumulatedMsRef.current,
      }, true)
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    window.addEventListener('beforeunload', onBeforeUnload)

    return () => {
      // Cleanup on path change: send a session_end for the *previous*
      // page so its duration is captured before we move on.
      clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (visibleStartRef.current !== null) {
        accumulatedMsRef.current += Date.now() - visibleStartRef.current
        visibleStartRef.current = null
      }
      if (accumulatedMsRef.current > 0) {
        send({
          event_type: 'session_end',
          page_path: currentPathRef.current,
          session_id: sessionIdRef.current,
          duration_ms: accumulatedMsRef.current,
        })
      }
    }
  }, [pathname])

  return null
}
