/**
 * GET /api/v1/rounds — list funding rounds with filters + cursor pagination.
 *
 * Query parameters:
 *   funding_type      comma-separated, e.g. "seed,series-a"
 *   country           comma-separated, e.g. "US,CA"
 *   industry          comma-separated industry tags
 *   min_amount        USD integer
 *   max_amount        USD integer
 *   published_after   ISO date
 *   published_before  ISO date
 *   has_ceo_contact   "true" | "false" — filter for whether ceo_email is set
 *   limit             1..100, default 25
 *   cursor            opaque pagination cursor (returned by previous call)
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-key'
import { listFundingRounds, type RoundFilters } from '@/lib/api/funding-rounds'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseCSV(v: string | null): string[] | undefined {
  if (!v) return undefined
  const list = v.split(',').map((s) => s.trim()).filter(Boolean)
  return list.length ? list : undefined
}

function parseInt32(v: string | null): number | undefined {
  if (v === null) return undefined
  const n = Number(v)
  return Number.isFinite(n) && Number.isInteger(n) ? n : undefined
}

function parseTriBool(v: string | null): boolean | undefined {
  if (v === null) return undefined
  if (v === 'true') return true
  if (v === 'false') return false
  return undefined
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'list_funding_rounds')
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const p = url.searchParams

  const filters: RoundFilters = {
    funding_type: parseCSV(p.get('funding_type')),
    country: parseCSV(p.get('country')),
    industry: parseCSV(p.get('industry')),
    min_amount: parseInt32(p.get('min_amount')),
    max_amount: parseInt32(p.get('max_amount')),
    published_after: p.get('published_after') || undefined,
    published_before: p.get('published_before') || undefined,
    has_ceo_contact: parseTriBool(p.get('has_ceo_contact')),
  }

  const limit = parseInt32(p.get('limit')) ?? 25
  const cursor = p.get('cursor')

  try {
    const result = await listFundingRounds({ filters, cursor, limit })
    return NextResponse.json(result)
  } catch (err) {
    console.error('GET /api/v1/rounds:', err)
    return NextResponse.json({ error: 'internal' }, { status: 500 })
  }
}
