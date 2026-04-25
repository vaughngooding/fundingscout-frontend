import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { hashVisitor } from '@/lib/visitor'

// POST /api/track
// Body: { event_type: 'page_view' | 'heartbeat' | 'session_end',
//         page_path: string, session_id: string,
//         duration_ms?: number, referrer?: string }
//
// Inserts into public.user_events. If the request has a Supabase auth
// cookie, attaches user_id; otherwise computes a daily-rotated hashed
// visitor_id from IP + user-agent.
//
// We always return 200 — even on validation errors — to avoid client-side
// retry loops. Failures are logged server-side instead.

const VALID_EVENTS = new Set(['page_view', 'heartbeat', 'session_end'])

// In-memory rate limit: max 60 events per session_id per minute.
// Keyed by session_id, value is array of recent event timestamps (ms).
// One Vercel instance only — fine at current scale, upgrade to Upstash
// if traffic grows past one warm instance.
const rateLimit = new Map<string, number[]>()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 60

function isRateLimited(sessionId: string): boolean {
  const now = Date.now()
  const recent = (rateLimit.get(sessionId) || []).filter(t => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_MAX) {
    rateLimit.set(sessionId, recent)
    return true
  }
  recent.push(now)
  rateLimit.set(sessionId, recent)
  return false
}

// Periodic prune so the Map doesn't grow forever in a long-lived instance.
let lastPrune = Date.now()
function maybePrune() {
  const now = Date.now()
  if (now - lastPrune < 5 * 60_000) return
  lastPrune = now
  for (const [k, v] of rateLimit.entries()) {
    const fresh = v.filter(t => now - t < RATE_WINDOW_MS)
    if (fresh.length === 0) rateLimit.delete(k)
    else rateLimit.set(k, fresh)
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    // sendBeacon ships application/json or text/plain depending on browser.
    // req.json() handles both for us.
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  const eventType = String(body.event_type || '')
  const pagePath = String(body.page_path || '')
  const sessionId = String(body.session_id || '')

  if (!VALID_EVENTS.has(eventType) || !pagePath || !sessionId) {
    return NextResponse.json({ ok: true }, { status: 200 })
  }

  if (isRateLimited(sessionId)) {
    return NextResponse.json({ ok: true, throttled: true }, { status: 200 })
  }
  maybePrune()

  // Identify user (logged-in) or hashed visitor (anonymous).
  let userId: string | null = null
  try {
    const auth = await createServerClient()
    const { data: { user } } = await auth.auth.getUser()
    if (user) userId = user.id
  } catch {
    // Auth lookup failed — fall through to anonymous tracking.
  }

  let visitorId: string | null = null
  if (!userId) {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'unknown'
    const ua = req.headers.get('user-agent') || 'unknown'
    visitorId = hashVisitor(ip, ua)
  }

  const userAgent = req.headers.get('user-agent')?.slice(0, 500) || null
  const referrer = typeof body.referrer === 'string' ? body.referrer.slice(0, 500) : null
  const durationMs = typeof body.duration_ms === 'number' && body.duration_ms >= 0
    ? Math.min(body.duration_ms, 24 * 60 * 60 * 1000)
    : null

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  const { error } = await supabase.from('user_events').insert({
    user_id: userId,
    visitor_id: visitorId,
    session_id: sessionId,
    event_type: eventType,
    page_path: pagePath.slice(0, 500),
    referrer,
    duration_ms: durationMs,
    user_agent: userAgent,
  })

  if (error) {
    console.error('[track] insert failed:', error.message)
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
