/**
 * API-key authentication middleware for /api/v1/* and /api/mcp.
 *
 * Flow:
 *   1. Parse `Authorization: Bearer fs_live_...` header.
 *   2. sha256 the token; look up fs_api_keys by key_hash (active only).
 *   3. Join to profiles; gate via canUseProFeatures(). Non-Pro → 403.
 *   4. Increment quota counters (per-tool + cap). Over-quota → 429.
 *   5. Bump fs_api_keys.last_used_at (best-effort, fire-and-forget).
 *   6. Return an AuthContext the route handler uses to scope its query.
 *
 * If any of steps 1-4 fail, the helper returns a fully-formed `Response`
 * the route just hands back. This keeps every route handler under 30 lines.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { Profile } from '@/lib/types'
import { canUseProFeatures } from '@/lib/access'
import { createServiceClient } from '@/lib/supabase/service'
import { hashApiKey, KEY_PREFIX } from '@/lib/api/keys'
import { checkAndIncrementQuota, DEFAULT_QUOTAS } from '@/lib/api/quota'

export interface AuthContext {
  userId: string
  profile: Profile
  keyId: string
  keyPrefix: string
}

export type AuthResult =
  | { ok: true; ctx: AuthContext }
  | { ok: false; response: NextResponse }

/**
 * Authenticate an API request and, if successful, increment the quota for
 * the named tool. Returns either an AuthContext or a ready-to-return error
 * Response.
 *
 * @param tool The tool/endpoint name. Used for per-tool quota tracking and
 *             appears in the audit log + admin dashboard.
 */
export async function authenticateApiKey(
  req: NextRequest,
  tool: string,
): Promise<AuthResult> {
  const authHeader = req.headers.get('authorization') || ''
  const match = authHeader.match(/^Bearer\s+(\S+)$/i)
  if (!match) {
    return errResponse(401, {
      error: 'missing_authorization',
      message: 'Provide an API key via "Authorization: Bearer fs_live_..." header.',
    })
  }

  const token = match[1]
  if (!token.startsWith(KEY_PREFIX)) {
    return errResponse(401, {
      error: 'invalid_key_format',
      message: `API keys begin with "${KEY_PREFIX}".`,
    })
  }

  const keyHash = hashApiKey(token)
  const sb = createServiceClient()

  // Look up the key + its owner's profile in a single query.
  const { data: keyRow, error: keyErr } = await sb
    .from('fs_api_keys')
    .select('id, user_id, prefix, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .maybeSingle()

  if (keyErr) {
    console.error('api-key: lookup failed', keyErr)
    return errResponse(500, { error: 'auth_lookup_failed' })
  }
  if (!keyRow) {
    return errResponse(401, {
      error: 'invalid_or_revoked_key',
      message: 'This API key is not recognized or has been revoked.',
    })
  }

  const { data: profile, error: profileErr } = await sb
    .from('profiles')
    .select('id, email, full_name, company, role, plan, legacy_free, timezone, stripe_customer_id')
    .eq('id', keyRow.user_id)
    .single()

  if (profileErr || !profile) {
    console.error('api-key: profile lookup failed', profileErr)
    return errResponse(500, { error: 'profile_lookup_failed' })
  }

  if (!canUseProFeatures(profile as Profile)) {
    return errResponse(403, {
      error: 'pro_required',
      message: 'API access requires a FundingScout Pro subscription.',
      upgrade_url: 'https://fundingscout.io/onboarding?step=plan',
    })
  }

  // Quota enforcement. We track per-tool quotas; the cap on a single tool
  // is the addressable abuse vector (e.g. 200/day reveal_contact prevents
  // CEO-email bulk-exfil even if other tools are fine).
  const limit = DEFAULT_QUOTAS[tool] ?? 100
  const quota = await checkAndIncrementQuota(keyRow.id, tool, limit)
  if (!quota.ok) {
    return errResponse(429, {
      error: 'over_quota',
      tool,
      message: `Daily quota for ${tool} exceeded. Retry after ${quota.day} 00:00 UTC.`,
      retry_after_seconds: quota.retryAfterSeconds,
    }, { 'Retry-After': String(quota.retryAfterSeconds) })
  }

  // Fire-and-forget last_used_at bump. Don't await — we don't care if it
  // lands, and we don't want to add latency to every API call.
  void sb
    .from('fs_api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyRow.id)
    .then(() => {}, () => {}) // swallow errors silently

  return {
    ok: true,
    ctx: {
      userId: keyRow.user_id,
      profile: profile as Profile,
      keyId: keyRow.id,
      keyPrefix: keyRow.prefix,
    },
  }
}

function errResponse(
  status: number,
  body: Record<string, unknown>,
  extraHeaders: Record<string, string> = {},
): AuthResult {
  return {
    ok: false,
    response: NextResponse.json(body, {
      status,
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
    }),
  }
}
