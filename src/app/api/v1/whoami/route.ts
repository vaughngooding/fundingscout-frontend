/**
 * GET /api/v1/whoami — self-check for the calling API key.
 *
 * Returns plan, key prefix, and per-tool quota remaining today. Useful for
 * Claude to introspect quotas before bulk operations ("how many reveals
 * remain?") and for users to verify their key works.
 */

import { NextRequest, NextResponse } from 'next/server'
import { authenticateApiKey } from '@/lib/auth/api-key'
import { DEFAULT_QUOTAS, getQuotaUsage } from '@/lib/api/quota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await authenticateApiKey(req, 'whoami')
  if (!auth.ok) return auth.response

  // Pull current usage for every tool we track quotas on
  const tools = Object.keys(DEFAULT_QUOTAS)
  const usage = await Promise.all(
    tools.map(async (tool) => {
      const { used, day } = await getQuotaUsage(auth.ctx.keyId, tool)
      const limit = DEFAULT_QUOTAS[tool]
      return {
        tool,
        used,
        limit,
        remaining: Math.max(0, limit - used),
        day,
      }
    }),
  )

  return NextResponse.json({
    plan: auth.ctx.profile.plan,
    email: auth.ctx.profile.email,
    key_prefix: auth.ctx.keyPrefix,
    quotas: usage,
  })
}
