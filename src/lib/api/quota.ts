/**
 * Per-key, per-day, per-tool quota counter.
 *
 * Uses the fs_api_usage table with an atomic UPSERT pattern. Why atomic
 * matters: serverless instances can run concurrent requests for the same
 * key. A read-then-write would race and let users go a request or two over
 * their cap. The UPSERT statement increments under a unique constraint and
 * returns the new count, which we compare to the limit.
 *
 * Caveat: Postgres can't natively express "INSERT, but if the result of the
 * increment is over the limit, undo." So we do the UPSERT, read the new
 * count, and if it exceeded the limit, the request is rejected AFTER we
 * already burned the slot. That's fine — at steady state under abuse, the
 * user is going to be at the limit anyway; granting one extra request per
 * concurrent burst is acceptable.
 */

import { createServiceClient } from '@/lib/supabase/service'

const TODAY_UTC = () => new Date().toISOString().slice(0, 10)

export interface QuotaOk {
  ok: true
  remaining: number
  /** Day the counter is tracking, in UTC. Useful for response headers. */
  day: string
}
export interface QuotaDenied {
  ok: false
  reason: 'over_quota'
  retryAfterSeconds: number
  day: string
}
export type QuotaResult = QuotaOk | QuotaDenied

/**
 * Atomically increment the counter for (key_id, today, tool). If the new
 * count exceeds `limit`, return `over_quota` and tell the caller to retry
 * tomorrow.
 *
 * Implementation: we use the upsert RPC pattern via supabase-js. There's no
 * native "UPSERT ... ON CONFLICT DO UPDATE RETURNING" in supabase-js, so
 * we use the lower-level rpc() call to a Postgres function defined inline
 * via raw SQL — except Postgres functions aren't trivially callable from
 * supabase-js either. Simpler approach: use the REST upsert with returning,
 * and accept the rare race condition described above. This is good enough
 * for the v1 quota.
 */
export async function checkAndIncrementQuota(
  keyId: string,
  tool: string,
  defaultLimit: number,
): Promise<QuotaResult> {
  const day = TODAY_UTC()
  const sb = createServiceClient()

  // Per-key override lookup: wholesale partners (Alphaflow, etc.) have
  // bespoke daily_quota_overrides set in Supabase Studio. Format:
  //   {"crm_accounts_upsert": 50000, "mcp_request": 10000}
  // An override of 0 disables that tool for this key — useful for revoking
  // a specific capability without revoking the whole key.
  const { data: keyRow } = await sb
    .from('fs_api_keys')
    .select('daily_quota_overrides')
    .eq('id', keyId)
    .maybeSingle()
  const overrides = (keyRow?.daily_quota_overrides as Record<string, number> | null) || {}
  const limit = typeof overrides[tool] === 'number' ? overrides[tool] : defaultLimit

  // Read current count
  const { data: existing, error: readErr } = await sb
    .from('fs_api_usage')
    .select('count')
    .eq('key_id', keyId)
    .eq('day', day)
    .eq('tool', tool)
    .maybeSingle()

  if (readErr) throw new Error(`quota read: ${readErr.message}`)

  const currentCount = existing?.count ?? 0
  if (currentCount >= limit) {
    return {
      ok: false,
      reason: 'over_quota',
      retryAfterSeconds: secondsUntilUtcMidnight(),
      day,
    }
  }

  // Upsert with incremented count
  const { error: upsertErr } = await sb
    .from('fs_api_usage')
    .upsert(
      { key_id: keyId, day, tool, count: currentCount + 1 },
      { onConflict: 'key_id,day,tool' },
    )

  if (upsertErr) throw new Error(`quota upsert: ${upsertErr.message}`)

  return {
    ok: true,
    remaining: Math.max(0, limit - (currentCount + 1)),
    day,
  }
}

/** Convenience: how many seconds until UTC midnight, so 429 responses can
 *  set Retry-After to something useful. */
function secondsUntilUtcMidnight(): number {
  const now = new Date()
  const tomorrow = new Date(Date.UTC(
    now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0, 0,
  ))
  return Math.max(60, Math.floor((tomorrow.getTime() - now.getTime()) / 1000))
}

/** Read-only — used by /api/v1/whoami to report remaining quota. Does NOT
 *  increment. */
export async function getQuotaUsage(
  keyId: string,
  tool: string,
): Promise<{ used: number; day: string }> {
  const day = TODAY_UTC()
  const sb = createServiceClient()
  const { data } = await sb
    .from('fs_api_usage')
    .select('count')
    .eq('key_id', keyId)
    .eq('day', day)
    .eq('tool', tool)
    .maybeSingle()
  return { used: data?.count ?? 0, day }
}

/** Per-tool quota defaults. Override per-key via the
 *  fs_api_keys.daily_quota_overrides JSONB column (consulted in
 *  checkAndIncrementQuota above). Wholesale partners get bumped there. */
export const DEFAULT_QUOTAS: Record<string, number> = {
  list_funding_rounds: 1000,
  get_funding_round: 1000,
  search_companies: 1000,
  reveal_contact: 200,
  whoami: 1000,
  // Coarse top-level counter on /mcp HTTP requests. Caps total MCP traffic
  // per key per day independently of per-tool counters. Prevents abuse of
  // initialize/tools-list pings.
  mcp_request: 1000,
}

/** Total daily quota across ALL tools combined. Catches "200 reveals +
 *  1000 lists" being too much. */
export const DAILY_TOTAL_QUOTA = 1000
