/**
 * POST /api/v1/keys/[id]/rotate-secret
 *
 * Regenerates the webhook signing secret for an API key. The old secret is
 * irrecoverable after this call. The new plaintext secret is returned ONCE in
 * the response and never stored anywhere else — the customer must update
 * their verification code immediately or webhook signature checks will fail.
 *
 * Auth: Supabase Auth cookie. Owner-only via the user_id filter in
 * rotateWebhookSecret(). RLS on fs_api_keys.UPDATE also enforces this.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { rotateWebhookSecret } from '@/lib/api/keys'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  try {
    const result = await rotateWebhookSecret(user.id, id)
    return NextResponse.json(result)
  } catch (err) {
    console.error('POST /api/v1/keys/[id]/rotate-secret:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
