'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * AuthProvider — keeps Server Components in sync with the client's auth state.
 *
 * When Supabase silently rotates the access token (every ~1h) or when the user
 * signs in / out in another tab, this listener calls router.refresh() so the
 * server re-renders with the fresh session cookie. Without this, a stale tab
 * can think it's logged out (or logged in) until the next hard navigation.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === 'TOKEN_REFRESHED' ||
        event === 'SIGNED_IN' ||
        event === 'SIGNED_OUT'
      ) {
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [router])

  return <>{children}</>
}
