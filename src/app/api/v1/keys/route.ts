/**
 * API-key management for the SETTINGS UI.
 *
 * Auth model: Supabase Auth cookie (NOT API key auth). Only the logged-in
 * user can manage their own keys.
 *
 *   GET    /api/v1/keys           list keys (active + revoked, prefix only)
 *   POST   /api/v1/keys           create a key, return full token ONCE
 *
 * Pro-gated: non-Pro users get 403 (no key management UI is shown to them
 * anyway, but enforce server-side too).
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { canUseProFeatures } from '@/lib/access'
import { createKey, listKeysForUser } from '@/lib/api/keys'
import { createServiceClient } from '@/lib/supabase/service'
import type { Profile } from '@/lib/types'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_ACTIVE_KEYS_PER_USER = 5
const MAX_NAME_LENGTH = 60

async function getProUser(req: NextRequest): Promise<
  | { ok: true; userId: string; profile: Profile }
  | { ok: false; response: NextResponse }
> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'unauthorized' }, { status: 401 }),
    }
  }
  // Use service-role for the profile read so we get all columns regardless
  // of RLS variations across plan column changes over time.
  const svc = createServiceClient()
  const { data: profile } = await svc
    .from('profiles')
    .select('id, email, full_name, company, role, plan, legacy_free, timezone, stripe_customer_id')
    .eq('id', user.id)
    .single()

  if (!profile || !canUseProFeatures(profile as Profile)) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: 'pro_required',
          message: 'API keys are a Pro feature. Upgrade to create one.',
          upgrade_url: '/onboarding?step=plan',
        },
        { status: 403 },
      ),
    }
  }
  // Make TypeScript happy about request usage; underscore avoids unused warn.
  void req
  return { ok: true, userId: user.id, profile: profile as Profile }
}

export async function GET(req: NextRequest) {
  const guard = await getProUser(req)
  if (!guard.ok) return guard.response

  try {
    const keys = await listKeysForUser(guard.userId)
    return NextResponse.json({ keys })
  } catch (err) {
    console.error('GET /api/v1/keys:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const guard = await getProUser(req)
  if (!guard.ok) return guard.response

  // Cap keys per user (loose anti-abuse — 5 active keys covers any reasonable
  // workflow: laptop, dev, CI, two more for good measure).
  const existing = await listKeysForUser(guard.userId)
  const activeCount = existing.filter((k) => !k.revoked_at).length
  if (activeCount >= MAX_ACTIVE_KEYS_PER_USER) {
    return NextResponse.json(
      {
        error: 'too_many_keys',
        message: `You have ${activeCount} active keys (limit ${MAX_ACTIVE_KEYS_PER_USER}). Revoke an unused one first.`,
      },
      { status: 400 },
    )
  }

  let name: string
  try {
    const body = await req.json()
    name = String(body?.name ?? '').trim()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!name) {
    return NextResponse.json(
      { error: 'name_required', message: 'Provide a "name" describing where this key will be used (e.g. "Claude Code laptop").' },
      { status: 400 },
    )
  }
  if (name.length > MAX_NAME_LENGTH) {
    return NextResponse.json(
      { error: 'name_too_long', message: `Max ${MAX_NAME_LENGTH} chars.` },
      { status: 400 },
    )
  }

  try {
    const created = await createKey(guard.userId, name)
    return NextResponse.json({ key: created }, { status: 201 })
  } catch (err) {
    console.error('POST /api/v1/keys:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
