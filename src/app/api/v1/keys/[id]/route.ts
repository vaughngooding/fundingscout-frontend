/**
 * PATCH /api/v1/keys/[id]  body: { revoked: true }    revoke a key
 *
 * Uses Supabase Auth cookie. RLS on fs_api_keys.UPDATE enforces ownership
 * (user_id = auth.uid()), but we belt-and-braces with an explicit ownership
 * check in revokeKey() too.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { revokeKey } from '@/lib/api/keys'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function PATCH(
  req: NextRequest,
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

  let body: { revoked?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (body.revoked !== true) {
    return NextResponse.json(
      { error: 'unsupported_update', message: 'Only { revoked: true } is supported (no edits).' },
      { status: 400 },
    )
  }

  try {
    await revokeKey(user.id, id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('PATCH /api/v1/keys/[id]:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
