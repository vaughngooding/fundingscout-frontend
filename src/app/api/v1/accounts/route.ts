/**
 * POST /api/v1/accounts
 *
 * Upsert customer's CRM accounts (companies) into crm_accounts, scoped to the
 * authenticated Pro user (auth.users.id from their fs_api_keys token).
 *
 * Request body:
 *   {
 *     "accounts": [
 *       { "external_id": "0014x...", "name": "Vellum AI", "domain": "vellum.ai", "metadata": {...} },
 *       ...
 *     ]
 *   }
 *
 * Max 1000 accounts per request. Repeat calls with the same external_id
 * update the row in place (upsert key: user_id + external_id).
 *
 * Response (200): { "upserted": N, "errors": [...] }
 *
 * DELETE /api/v1/accounts?external_id=...
 *   Removes a single account by external_id.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-key'
import { createServiceClient } from '@/lib/supabase/service'
import { normalizeDomain, normalizeName } from '@/lib/api-domain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BATCH = 1000

interface AccountInput {
  external_id: unknown
  name: unknown
  domain?: unknown
  metadata?: unknown
}

interface ValidatedAccount {
  external_id: string
  name: string
  domain: string | null
  normalized_domain: string | null
  normalized_name: string | null
  metadata: Record<string, unknown> | null
}

function validateAccount(
  raw: AccountInput,
  idx: number,
): ValidatedAccount | { error: string; idx: number } {
  if (typeof raw.external_id !== 'string' || !raw.external_id.trim()) {
    return { error: 'external_id is required and must be a non-empty string', idx }
  }
  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    return { error: 'name is required and must be a non-empty string', idx }
  }
  const domain =
    typeof raw.domain === 'string' && raw.domain.trim() ? raw.domain.trim() : null
  const normalized_domain = normalizeDomain(domain)
  const normalized_name = normalizeName(raw.name) || null
  let metadata: Record<string, unknown> | null = null
  if (raw.metadata !== undefined && raw.metadata !== null) {
    if (typeof raw.metadata !== 'object' || Array.isArray(raw.metadata)) {
      return { error: 'metadata must be a JSON object', idx }
    }
    metadata = raw.metadata as Record<string, unknown>
  }
  return {
    external_id: raw.external_id.trim(),
    name: raw.name.trim(),
    domain,
    normalized_domain,
    normalized_name,
    metadata,
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'crm_accounts_upsert')
  if (!auth.ok) return auth.response

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'invalid_json', message: 'Request body must be valid JSON.' } },
      { status: 400 },
    )
  }

  const accounts = (body as { accounts?: unknown })?.accounts
  if (!Array.isArray(accounts)) {
    return NextResponse.json(
      {
        error: {
          code: 'invalid_body',
          message: 'Request body must be `{ "accounts": [...] }`.',
        },
      },
      { status: 400 },
    )
  }
  if (accounts.length === 0) return NextResponse.json({ upserted: 0, errors: [] })
  if (accounts.length > MAX_BATCH) {
    return NextResponse.json(
      {
        error: {
          code: 'batch_too_large',
          message: `Max ${MAX_BATCH} accounts per request. Got ${accounts.length}.`,
        },
      },
      { status: 400 },
    )
  }

  const validated: ValidatedAccount[] = []
  const errors: Array<{ index: number; error: string }> = []
  for (let i = 0; i < accounts.length; i++) {
    const result = validateAccount(accounts[i] as AccountInput, i)
    if ('error' in result) errors.push({ index: result.idx, error: result.error })
    else validated.push(result)
  }

  if (validated.length === 0) {
    return NextResponse.json({ upserted: 0, errors }, { status: 400 })
  }

  const sb = createServiceClient()
  const rows = validated.map((v) => ({
    user_id: auth.ctx.userId,
    external_id: v.external_id,
    name: v.name,
    domain: v.domain,
    normalized_domain: v.normalized_domain,
    normalized_name: v.normalized_name,
    metadata: v.metadata,
  }))

  const { error: upsertError, count } = await sb
    .from('crm_accounts')
    .upsert(rows, { onConflict: 'user_id,external_id', count: 'exact' })

  if (upsertError) {
    console.error('api/v1/accounts upsert error', upsertError)
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to upsert accounts.' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ upserted: count ?? rows.length, errors })
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'crm_accounts_delete')
  if (!auth.ok) return auth.response

  const url = new URL(req.url)
  const externalId = url.searchParams.get('external_id')
  if (!externalId) {
    return NextResponse.json(
      {
        error: { code: 'missing_param', message: 'external_id query param is required.' },
      },
      { status: 400 },
    )
  }

  const sb = createServiceClient()
  const { error, count } = await sb
    .from('crm_accounts')
    .delete({ count: 'exact' })
    .eq('user_id', auth.ctx.userId)
    .eq('external_id', externalId)

  if (error) {
    console.error('api/v1/accounts delete error', error)
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to delete account.' } },
      { status: 500 },
    )
  }
  return NextResponse.json({ deleted: count ?? 0 })
}
