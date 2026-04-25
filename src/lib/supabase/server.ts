import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              // Mirror middleware's persistent cookie attributes so Server
              // Actions / Route Handlers that mutate the session also write
              // long-lived, cross-tab-durable cookies.
              const persistentOptions = {
                ...options,
                maxAge: options?.maxAge ?? 60 * 60 * 24 * 400,
                sameSite: 'lax' as const,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
              }
              cookieStore.set(name, value, persistentOptions)
            })
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing sessions.
          }
        },
      },
    }
  )
}
