import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) => {
            // Force durable, cross-tab-friendly cookie attributes regardless
            // of @supabase/ssr defaults. Fixes "logged out across tabs and
            // navigation" symptom in browsers like Brave / Firefox / Arc that
            // can be inconsistent with cookies missing explicit attributes.
            const persistentOptions = {
              ...options,
              maxAge: options?.maxAge ?? 60 * 60 * 24 * 400, // 400 days (RFC max)
              sameSite: 'lax' as const,
              secure: process.env.NODE_ENV === 'production',
              path: '/',
            }
            supabaseResponse.cookies.set(name, value, persistentOptions)
          })
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Redirect unauthenticated users away from protected routes.
  // Public routes (no auth needed): the marketing landing, auth flow,
  // and the legal/compliance pages that Twilio TFV reviewers visit
  // without an account.
  const path = request.nextUrl.pathname
  const isPublic =
    path === '/' ||
    path.startsWith('/login') ||
    path.startsWith('/signup') ||
    path.startsWith('/auth') ||
    path.startsWith('/sms') ||
    path.startsWith('/privacy') ||
    // Public docs — must be readable without a session so we can share URLs
    // with prospects, partners, and search engines.
    path.startsWith('/docs') ||
    // Bearer-token endpoints — auth runs inside the route handler, not via
    // session cookie. Without this skip, middleware 307s them to /login and
    // MCP clients / API consumers fail with confusing errors.
    path === '/mcp' ||
    path.startsWith('/api/mcp') ||
    path.startsWith('/api/v1')

  if (!user && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
