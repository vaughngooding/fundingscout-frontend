/**
 * Shared query layer used by BOTH the REST endpoints under /api/v1/* AND
 * the MCP tools under /api/mcp. Single source of truth for filter parsing,
 * cursor encoding, and what fields ship in each response shape.
 *
 * Key shape contracts:
 *   - `listFundingRounds` returns rounds WITHOUT ceo_email/linkedin (those
 *     are gated to reveal_contact).
 *   - `getFundingRound` returns one round WITHOUT contacts.
 *   - `revealContact` returns ONLY contacts (and writes an audit row).
 *   - `searchCompanies` returns lightweight rows for autocomplete-style use.
 */

import { createServiceClient } from '@/lib/supabase/service'

// ---------------------------------------------------------------------------
// Public types — what the API/MCP returns
// ---------------------------------------------------------------------------

/** Round summary returned by list/get. Excludes CEO contact info. */
export interface RoundSummary {
  id: string
  company_name: string
  website: string | null
  location: string | null
  location_country: string | null
  amount_usd: number
  funding_type: string
  investors: string[] | null
  lead_investor: string | null
  industry: string | null
  industry_tags: string[]
  article_url: string
  article_title: string | null
  source_feed: string | null
  published_date: string | null
  created_at: string
  /** Useful for the MCP user to know if reveal_contact will return anything. */
  has_ceo_contact: boolean
}

export interface RoundContact {
  funding_round_id: string
  company_name: string
  ceo_name: string | null
  ceo_email: string | null
  ceo_linkedin_url: string | null
  ceo_email_source: string | null
}

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface RoundFilters {
  funding_type?: string[]        // ['seed', 'series-a']
  country?: string[]             // ['US', 'CA']
  industry?: string[]            // intersected with industry_tags via GIN
  min_amount?: number            // USD
  max_amount?: number            // USD
  published_after?: string       // ISO date (e.g. '2026-04-01')
  published_before?: string      // ISO date
  has_ceo_contact?: boolean      // true → only rounds with ceo_email
}

// ---------------------------------------------------------------------------
// Cursor encoding
// ---------------------------------------------------------------------------

interface Cursor {
  /** ISO date of the last item shown. */
  d: string | null
  /** UUID of the last item shown. */
  i: string
}

function encodeCursor(c: Cursor): string {
  return Buffer.from(JSON.stringify(c), 'utf-8').toString('base64url')
}

function decodeCursor(raw: string | undefined | null): Cursor | null {
  if (!raw) return null
  try {
    const json = Buffer.from(raw, 'base64url').toString('utf-8')
    const parsed = JSON.parse(json) as Cursor
    if (typeof parsed.i !== 'string') return null
    return parsed
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// listFundingRounds
// ---------------------------------------------------------------------------

const ROUND_SUMMARY_COLUMNS =
  'id, company_name, website, location, location_country, amount_usd, ' +
  'funding_type, investors, lead_investor, industry, industry_tags, ' +
  'article_url, article_title, source_feed, published_date, created_at, ' +
  'ceo_email'

export interface ListResult {
  rounds: RoundSummary[]
  next_cursor: string | null
}

export async function listFundingRounds(opts: {
  filters?: RoundFilters
  cursor?: string | null
  limit?: number
}): Promise<ListResult> {
  const limit = Math.min(Math.max(opts.limit ?? 25, 1), 100)
  const filters = opts.filters ?? {}
  const sb = createServiceClient()
  const cursor = decodeCursor(opts.cursor)

  let q = sb
    .from('funding_rounds')
    .select(ROUND_SUMMARY_COLUMNS)
    .order('published_date', { ascending: false, nullsFirst: false })
    .order('id', { ascending: false })
    .limit(limit + 1) // fetch one extra to know if there's a next page

  if (filters.funding_type?.length) q = q.in('funding_type', filters.funding_type)
  if (filters.country?.length) q = q.in('location_country', filters.country)
  if (filters.industry?.length) q = q.overlaps('industry_tags', filters.industry)
  if (filters.min_amount !== undefined) q = q.gte('amount_usd', filters.min_amount)
  if (filters.max_amount !== undefined) q = q.lte('amount_usd', filters.max_amount)
  if (filters.published_after) q = q.gte('published_date', filters.published_after)
  if (filters.published_before) q = q.lte('published_date', filters.published_before)
  if (filters.has_ceo_contact === true) q = q.not('ceo_email', 'is', null)
  if (filters.has_ceo_contact === false) q = q.is('ceo_email', null)

  if (cursor) {
    // Keyset pagination: WHERE (published_date, id) < (cursor.d, cursor.i).
    // Supabase REST doesn't support row-value comparison, so emulate:
    //   published_date < d OR (published_date = d AND id < i)
    // Note: if a row's published_date is NULL the ordering above puts it at
    // the bottom, so we treat that as "any null is past the cursor."
    if (cursor.d) {
      q = q.or(
        `published_date.lt.${cursor.d},and(published_date.eq.${cursor.d},id.lt.${cursor.i})`,
      )
    } else {
      q = q.lt('id', cursor.i)
    }
  }

  const { data, error } = await q
  if (error) throw new Error(`listFundingRounds: ${error.message}`)

  const rows = ((data || []) as unknown) as Array<RoundSummary & { ceo_email: string | null }>
  const hasMore = rows.length > limit
  const page = hasMore ? rows.slice(0, limit) : rows

  // Strip ceo_email (we used it only to compute has_ceo_contact)
  const cleaned: RoundSummary[] = page.map((r) => {
    const { ceo_email, ...rest } = r
    return { ...rest, has_ceo_contact: Boolean(ceo_email) }
  })

  let next_cursor: string | null = null
  if (hasMore && cleaned.length > 0) {
    const last = cleaned[cleaned.length - 1]
    next_cursor = encodeCursor({ d: last.published_date, i: last.id })
  }

  return { rounds: cleaned, next_cursor }
}

// ---------------------------------------------------------------------------
// getFundingRound
// ---------------------------------------------------------------------------

export async function getFundingRound(id: string): Promise<RoundSummary | null> {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('funding_rounds')
    .select(ROUND_SUMMARY_COLUMNS)
    .eq('id', id)
    .maybeSingle()
  if (error) throw new Error(`getFundingRound: ${error.message}`)
  if (!data) return null
  const row = (data as unknown) as RoundSummary & { ceo_email: string | null }
  const { ceo_email, ...rest } = row
  return { ...rest, has_ceo_contact: Boolean(ceo_email) }
}

// ---------------------------------------------------------------------------
// searchCompanies (fuzzy on name)
// ---------------------------------------------------------------------------

export async function searchCompanies(query: string, limit = 10): Promise<RoundSummary[]> {
  const q = query.trim()
  if (q.length < 2) return []
  const sb = createServiceClient()
  // ILIKE is fine for v1 — the existing `idx_funding_rounds_company_lower`
  // makes prefix matches fast.
  const { data, error } = await sb
    .from('funding_rounds')
    .select(ROUND_SUMMARY_COLUMNS)
    .ilike('company_name', `%${q}%`)
    .order('created_at', { ascending: false })
    .limit(Math.min(Math.max(limit, 1), 50))
  if (error) throw new Error(`searchCompanies: ${error.message}`)
  return (((data || []) as unknown) as Array<RoundSummary & { ceo_email: string | null }>).map((r) => {
    const { ceo_email, ...rest } = r
    return { ...rest, has_ceo_contact: Boolean(ceo_email) }
  })
}

// ---------------------------------------------------------------------------
// revealContact — writes audit log
// ---------------------------------------------------------------------------

export async function revealContact(opts: {
  fundingRoundId: string
  keyId: string
  userId: string
}): Promise<RoundContact | null> {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('funding_rounds')
    .select('id, company_name, ceo_name, ceo_email, ceo_linkedin_url, ceo_email_source')
    .eq('id', opts.fundingRoundId)
    .maybeSingle()
  if (error) throw new Error(`revealContact: ${error.message}`)
  if (!data) return null

  // Audit row — fire-and-forget. We don't want a logging hiccup to fail the
  // call, but we DO need this to be best-effort so the admin spike-detection
  // tile actually sees usage.
  void sb
    .from('fs_contact_reveals')
    .insert({
      key_id: opts.keyId,
      user_id: opts.userId,
      funding_round_id: opts.fundingRoundId,
    })
    .then(({ error }) => {
      if (error) console.error('contact_reveals insert failed:', error)
    })

  return {
    funding_round_id: data.id,
    company_name: data.company_name,
    ceo_name: data.ceo_name ?? null,
    ceo_email: data.ceo_email ?? null,
    ceo_linkedin_url: data.ceo_linkedin_url ?? null,
    ceo_email_source: data.ceo_email_source ?? null,
  }
}

// Exported helpers for tests
export const __testHelpers = { encodeCursor, decodeCursor }
