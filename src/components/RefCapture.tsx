'use client'

import { useEffect } from 'react'

/**
 * Captures the ?ref=<platform>-<YYYYMMDD> URL param on every page load and
 * stores it in localStorage with a 30-day TTL. Signup form reads from
 * searchParams first, falls back to localStorage — so attribution survives
 * users browsing other pages between landing and signup.
 *
 * Mounted in the root layout. Runs on mount, no UI.
 */
export default function RefCapture() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (!ref) return

    const payload = JSON.stringify({
      ref,
      ts: Date.now(),
    })
    try {
      window.localStorage.setItem('fs_ref', payload)
    } catch {
      // localStorage blocked (private mode, quota) — silently no-op.
    }
  }, [])

  return null
}

/**
 * Read the stored ref from localStorage if it's <30 days old.
 * Returns null if no ref was captured or if the stored ref has expired.
 * Use from the signup form: const ref = searchParams.get('ref') ?? readStoredRef()
 */
export function readStoredRef(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem('fs_ref')
    if (!raw) return null
    const parsed = JSON.parse(raw) as { ref: string; ts: number }
    const ageMs = Date.now() - parsed.ts
    const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000
    if (ageMs > THIRTY_DAYS) {
      window.localStorage.removeItem('fs_ref')
      return null
    }
    return parsed.ref
  } catch {
    return null
  }
}
