/**
 * POST /api/v1/rounds/[id]/contact — reveal CEO contact for a funding round.
 *
 * Separated from GET /api/v1/rounds/[id] because:
 *   1. It has its own (tighter) daily quota — 200/day vs 1000/day for browse.
 *   2. Every successful call writes a row to fs_contact_reveals for audit.
 *   3. We want the audit trail to clearly distinguish "saw the round" from
 *      "actually fetched the contact info" — different intent, different
 *      risk profile.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-key'
import { revealContact } from '@/lib/api/funding-rounds'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiKey(req, 'reveal_contact')
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  try {
    const contact = await revealContact({
      fundingRoundId: id,
      keyId: auth.ctx.keyId,
      userId: auth.ctx.userId,
    })
    if (!contact) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ contact })
  } catch (err) {
    console.error('POST /api/v1/rounds/[id]/contact:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
