/**
 * POST /api/v1/webhooks
 *
 * Register or update the webhook URL where FundingScout will POST CRM match
 * notifications. Stored on user_preferences.crm_webhook_url.
 *
 * Request body: { "url": "https://customer.example.com/hooks/fs" }
 *   - url must be HTTPS
 *   - Pass null or empty string to clear (switch to pull-only mode)
 *
 * Response: { "webhook_url": "https://..." | null }
 *
 * GET /api/v1/webhooks → { "webhook_url": ... }
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-key'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function validateWebhookUrl(s: string): { ok: true; url: string } | { ok: false; reason: string } {
  let parsed: URL
  try {
    parsed = new URL(s)
  } catch {
    return { ok: false, reason: 'url must be a valid absolute URL' }
  }
  if (parsed.protocol !== 'https:') {
    return { ok: false, reason: 'url must use https:// (http is rejected)' }
  }
  if (!parsed.hostname) return { ok: false, reason: 'url is missing a hostname' }
  const host = parsed.hostname.toLowerCase()
  if (host === 'localhost' || host === '127.0.0.1' || host === '::1') {
    return { ok: false, reason: 'webhook URL cannot point to localhost' }
  }
  if (host.endsWith('.local')) {
    return { ok: false, reason: 'webhook URL cannot use .local hostnames' }
  }
  return { ok: true, url: parsed.toString() }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'crm_webhook_set')
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    )
  }

  const rawUrl = (body as { url?: unknown })?.url
  const sb = createServiceClient()

  if (rawUrl === '' || rawUrl === null) {
    const { error } = await sb
      .from('user_preferences')
      .update({ crm_webhook_url: null })
      .eq('user_id', auth.ctx.userId)
    if (error) {
      return NextResponse.json(
        { error: { code: 'db_error', message: 'Failed to clear webhook.' } },
        { status: 500 },
      )
    }
    return NextResponse.json({ webhook_url: null })
  }

  if (typeof rawUrl !== 'string') {
    return NextResponse.json(
      {
        error: {
          code: 'invalid_body',
          message: '`url` must be a string (or null to clear).',
        },
      },
      { status: 400 },
    )
  }

  const v = validateWebhookUrl(rawUrl)
  if (!v.ok) {
    return NextResponse.json(
      { error: { code: 'invalid_url', message: v.reason } },
      { status: 400 },
    )
  }

  const { error } = await sb
    .from('user_preferences')
    .update({ crm_webhook_url: v.url })
    .eq('user_id', auth.ctx.userId)
  if (error) {
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to update webhook.' } },
      { status: 500 },
    )
  }
  return NextResponse.json({ webhook_url: v.url })
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'crm_webhook_get')
  if (!auth.ok) return auth.response

  const sb = createServiceClient()
  const { data, error } = await sb
    .from('user_preferences')
    .select('crm_webhook_url')
    .eq('user_id', auth.ctx.userId)
    .maybeSingle()

  if (error) {
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to read webhook.' } },
      { status: 500 },
    )
  }
  return NextResponse.json({ webhook_url: data?.crm_webhook_url ?? null })
}
