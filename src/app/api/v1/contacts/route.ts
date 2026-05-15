/**
 * POST /api/v1/contacts
 *
 * Upsert customer's CRM contacts (people) into crm_contacts, scoped to the
 * authenticated Pro user.
 *
 * Request body:
 *   {
 *     "contacts": [
 *       {
 *         "external_id": "0034x...",
 *         "email": "sarah@vellum.ai",
 *         "first_name": "Sarah",
 *         "last_name": "Park",
 *         "account_external_id": "0014x...",     // optional; links to crm_accounts
 *         "metadata": {...}
 *       },
 *       ...
 *     ]
 *   }
 *
 * Max 1000 contacts per request. Upsert key: (user_id, external_id).
 *
 * Response (200): { "upserted": N, "errors": [...] }
 *
 * DELETE /api/v1/contacts?external_id=...
 *   Removes a single contact by external_id.
 */
import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-key'
import { createServiceClient } from '@/lib/supabase/service'
import { extractEmailDomain } from '@/lib/api-domain'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_BATCH = 1000

interface ContactInput {
  external_id: unknown
  email?: unknown
  first_name?: unknown
  last_name?: unknown
  account_external_id?: unknown
  metadata?: unknown
}

interface ValidatedContact {
  external_id: string
  email: string | null
  email_domain: string | null
  first_name: string | null
  last_name: string | null
  account_external_id: string | null
  metadata: Record<string, unknown> | null
}

function strOrNull(x: unknown): string | null {
  if (typeof x !== 'string') return null
  const t = x.trim()
  return t || null
}

function validateContact(
  raw: ContactInput,
  idx: number,
): ValidatedContact | { error: string; idx: number } {
  if (typeof raw.external_id !== 'string' || !raw.external_id.trim()) {
    return { error: 'external_id is required and must be a non-empty string', idx }
  }
  const email = strOrNull(raw.email)?.toLowerCase() ?? null
  const email_domain = email ? extractEmailDomain(email) : null
  let metadata: Record<string, unknown> | null = null
  if (raw.metadata !== undefined && raw.metadata !== null) {
    if (typeof raw.metadata !== 'object' || Array.isArray(raw.metadata)) {
      return { error: 'metadata must be a JSON object', idx }
    }
    metadata = raw.metadata as Record<string, unknown>
  }
  return {
    external_id: raw.external_id.trim(),
    email,
    email_domain,
    first_name: strOrNull(raw.first_name),
    last_name: strOrNull(raw.last_name),
    account_external_id: strOrNull(raw.account_external_id),
    metadata,
  }
}

export async function POST(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'crm_contacts_upsert')
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

  const contacts = (body as { contacts?: unknown })?.contacts
  if (!Array.isArray(contacts)) {
    return NextResponse.json(
      {
        error: {
          code: 'invalid_body',
          message: 'Request body must be `{ "contacts": [...] }`.',
        },
      },
      { status: 400 },
    )
  }
  if (contacts.length === 0) return NextResponse.json({ upserted: 0, errors: [] })
  if (contacts.length > MAX_BATCH) {
    return NextResponse.json(
      {
        error: {
          code: 'batch_too_large',
          message: `Max ${MAX_BATCH} contacts per request. Got ${contacts.length}.`,
        },
      },
      { status: 400 },
    )
  }

  const validated: ValidatedContact[] = []
  const errors: Array<{ index: number; error: string }> = []
  for (let i = 0; i < contacts.length; i++) {
    const result = validateContact(contacts[i] as ContactInput, i)
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
    email: v.email,
    email_domain: v.email_domain,
    first_name: v.first_name,
    last_name: v.last_name,
    account_external_id: v.account_external_id,
    metadata: v.metadata,
  }))

  const { error: upsertError, count } = await sb
    .from('crm_contacts')
    .upsert(rows, { onConflict: 'user_id,external_id', count: 'exact' })

  if (upsertError) {
    console.error('api/v1/contacts upsert error', upsertError)
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to upsert contacts.' } },
      { status: 500 },
    )
  }

  return NextResponse.json({ upserted: count ?? rows.length, errors })
}

export async function DELETE(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'crm_contacts_delete')
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
    .from('crm_contacts')
    .delete({ count: 'exact' })
    .eq('user_id', auth.ctx.userId)
    .eq('external_id', externalId)

  if (error) {
    console.error('api/v1/contacts delete error', error)
    return NextResponse.json(
      { error: { code: 'db_error', message: 'Failed to delete contact.' } },
      { status: 500 },
    )
  }
  return NextResponse.json({ deleted: count ?? 0 })
}
