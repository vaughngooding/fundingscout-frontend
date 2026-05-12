/**
 * GET /api/v1/rounds/[id] — single funding round by UUID.
 *
 * Does NOT include CEO contact. Caller must hit POST /api/v1/rounds/[id]/contact
 * for that, which has its own quota + audit log.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-key'
import { getFundingRound } from '@/lib/api/funding-rounds'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await authenticateApiKey(req, 'get_funding_round')
  if (!auth.ok) return auth.response

  const { id } = await params
  if (!UUID_RE.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  try {
    const round = await getFundingRound(id)
    if (!round) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 })
    }
    return NextResponse.json({ round })
  } catch (err) {
    console.error('GET /api/v1/rounds/[id]:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
