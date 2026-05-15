/**
 * GET /api/v1/matches
 *
 * Paginated list of funding-round matches for the authenticated Pro user.
 * The "pull" alternative to push webhooks — use this if you can't host an
 * HTTPS endpoint, or as recovery after webhook failures.
 *
 * Query params:
 *   since=<iso8601>    Return matches with created_at < this timestamp (cursor).
 *   limit=<int>        Max 200 per page; default 50.
 *   status=<csv>       Filter by webhook_status (delivered,failed,no_webhook,pending). Default: all.
 *
 * Response:
 *   {
 *     "data": [
 *       {
 *         "match_id": "...",
 *         "match_type": "account_domain",
 *         "matched": { "account_external_id": "...", "contact_external_id": null },
 *         "webhook_status": "delivered",
 *         "webhook_response_code": 200,
 *         "delivered_at": "...",
 *         "created_at": "...",
 *         "funding_round": { ... }
 *       },
 *       ...
 *     ],
 *     "next_cursor": "<iso8601>" | null
 *   }
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-key'
import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 200

interface MatchRow {
  id: string
  match_type: string
  webhook_status: string | null
  webhook_response_code: number | null
  delivered_at: string | null
  created_at: string
  crm_account: { external_id: string; metadata: Record<string, unknown> | null } | null
  crm_contact: { external_id: string; metadata: Record<string, unknown> | null } | null
  funding_round: Record<string, unknown> | null
}

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'crm_matches_list')
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const since = url.searchParams.get('since')
  const limitRaw = parseInt(url.searchParams.get('limit') || '', 10)
  const limit = Math.min(
    Number.isFinite(limitRaw) && limitRaw > 0 ? limitRaw : DEFAULT_LIMIT,
    MAX_LIMIT,
  )
  const statusFilter = url.searchParams.get('status')

  const sb = createServiceClient()
  let query = sb
    .from('crm_match_notifications')
    .select(
      `
        id,
        match_type,
        webhook_status,
        webhook_response_code,
        delivered_at,
        created_at,
        crm_account:crm_accounts(external_id, metadata),
        crm_contact:crm_contacts(external_id, metadata),
        funding_round:funding_rounds(
          id,
          company_name,
          amount_usd,
          funding_type,
          website,
          article_url,
          article_title,
          published_date,
          ceo_name,
          ceo_email,
          ceo_linkedin_url,
          industry,
          location,
          location_country,
          lead_investor,
          investors,
          confidence_score
        )
      `,
    )
    .eq('user_id', auth.ctx.userId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (since) query = query.lt('created_at', since)
  if (statusFilter) {
    const statuses = statusFilter.split(',').map((s) => s.trim()).filter(Boolean)
    if (statuses.length > 0) query = query.in('webhook_status', statuses)
  }

  const { data, error } = await query
  if (error) {
    console.error('api/v1/matches query error', error)
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to fetch matches.' } },
      { status: 500 },
    )
  }

  const rows = (data || []) as unknown as MatchRow[]
  const items = rows.map((r) => ({
    match_id: r.id,
    match_type: r.match_type,
    matched: {
      account_external_id: r.crm_account?.external_id ?? null,
      contact_external_id: r.crm_contact?.external_id ?? null,
      account_metadata: r.crm_account?.metadata ?? null,
      contact_metadata: r.crm_contact?.metadata ?? null,
    },
    webhook_status: r.webhook_status,
    webhook_response_code: r.webhook_response_code,
    delivered_at: r.delivered_at,
    created_at: r.created_at,
    funding_round: r.funding_round,
  }))

  const next_cursor =
    items.length === limit ? items[items.length - 1].created_at : null

  return NextResponse.json({ data: items, next_cursor })
}
