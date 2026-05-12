/**
 * GET /api/v1/companies/search?q=...&limit=10
 *
 * Fuzzy company-name search. Returns RoundSummary rows (most recent first)
 * matching the query. Useful for "did Acme Corp raise recently?" lookups
 * from Claude.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-key'
import { searchCompanies } from '@/lib/api/funding-rounds'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'search_companies')
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const q = url.searchParams.get('q')?.trim() ?? ''
  if (q.length < 2) {
    return NextResponse.json(
      { error: 'q_too_short', message: 'Provide at least 2 characters in ?q=.' },
      { status: 400 },
    )
  }
  const limit = Math.min(Math.max(Number(url.searchParams.get('limit')) || 10, 1), 50)

  try {
    const rounds = await searchCompanies(q, limit)
    return NextResponse.json({ rounds })
  } catch (err) {
    console.error('GET /api/v1/companies/search:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
