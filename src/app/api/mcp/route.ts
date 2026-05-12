/**
 * Hosted MCP server at /mcp (rewritten from /api/mcp via next.config.ts).
 *
 * Architecture:
 *   - Uses `WebStandardStreamableHTTPServerTransport` from the official
 *     `@modelcontextprotocol/sdk` (works natively with Next.js Request/Response).
 *   - Stateless mode (no sessionIdGenerator) — every request creates a fresh
 *     transport. Simplest for Vercel serverless: no shared state needed.
 *   - JSON response mode (`enableJsonResponse: true`) — short tool calls
 *     don't need SSE streaming. Switch to false later if we add long-running
 *     tools.
 *   - Auth is via `Authorization: Bearer fs_live_...` header, validated
 *     BEFORE we hand the request to the MCP transport. Quota is incremented
 *     ONCE on the parent `/mcp` request — the MCP SDK then dispatches tool
 *     calls below, which read from the shared query layer.
 *
 * Tool surface (mirrors the REST endpoints):
 *   - list_funding_rounds(filters, cursor, limit)
 *   - get_funding_round(id)
 *   - search_companies(query, limit)
 *   - reveal_contact(funding_round_id)
 *   - whoami()
 *
 * Note: we authenticate ONCE per HTTP request, but a single JSON-RPC batch
 * can contain multiple tool calls. To prevent a malicious key from making
 * 1000 reveal_contact calls in a single HTTP request and only paying for
 * one quota slot, each tool's handler re-checks its own quota inline. The
 * top-level `authenticateApiKey` validates the key + Pro status + the
 * shared 'mcp_request' counter (1000/day); per-tool counters defend the
 * narrow quotas like reveal_contact's 200/day.
 */

import { NextRequest, NextResponse } from 'next/server'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'
import { z } from 'zod'

import { authenticateApiKey, type AuthContext } from '@/lib/auth/api-key'
import {
  listFundingRounds,
  getFundingRound,
  searchCompanies,
  revealContact,
  type RoundFilters,
} from '@/lib/api/funding-rounds'
import { checkAndIncrementQuota, DEFAULT_QUOTAS, getQuotaUsage } from '@/lib/api/quota'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** Per-tool quota helper: returns null if OK, or a JSON error object if over. */
async function gateTool(
  ctx: AuthContext,
  tool: string,
): Promise<null | { error: string; tool: string; retry_after_seconds: number }> {
  const limit = DEFAULT_QUOTAS[tool] ?? 100
  const result = await checkAndIncrementQuota(ctx.keyId, tool, limit)
  if (!result.ok) {
    return {
      error: 'over_quota',
      tool,
      retry_after_seconds: result.retryAfterSeconds,
    }
  }
  return null
}

/** Kill switch — flip MCP_ENABLED=false in Vercel env to immediately stop
 *  serving without redeploy. */
function mcpDisabled(): boolean {
  return process.env.MCP_ENABLED === 'false'
}

function buildMcpServer(ctx: AuthContext): McpServer {
  const server = new McpServer({
    name: 'fundingscout',
    version: '1.0.0',
  })

  // --- list_funding_rounds ---------------------------------------------------
  server.tool(
    'list_funding_rounds',
    'List recent funding rounds with optional filters. Returns rounds WITHOUT CEO contact info — call reveal_contact for that.',
    {
      funding_type: z.array(z.string()).optional()
        .describe('Filter: round types, e.g. ["seed", "series-a"]'),
      country: z.array(z.string()).optional()
        .describe('Filter: ISO country codes, e.g. ["US", "CA"]. Empty = worldwide.'),
      industry: z.array(z.string()).optional()
        .describe('Filter: industry tags, e.g. ["AI/ML", "B2B", "FinTech"]'),
      min_amount: z.number().int().nonnegative().optional()
        .describe('Min round size USD'),
      max_amount: z.number().int().nonnegative().optional()
        .describe('Max round size USD'),
      published_after: z.string().optional()
        .describe('ISO date — only rounds published on/after this date'),
      published_before: z.string().optional()
        .describe('ISO date — only rounds published on/before this date'),
      has_ceo_contact: z.boolean().optional()
        .describe('true = only rounds with a known CEO email; false = only those without'),
      limit: z.number().int().min(1).max(100).default(25),
      cursor: z.string().optional()
        .describe('Pagination cursor returned from a previous call'),
    },
    async (input) => {
      const denied = await gateTool(ctx, 'list_funding_rounds')
      if (denied) return { content: [{ type: 'text', text: JSON.stringify(denied) }], isError: true }

      const { limit, cursor, ...filterFields } = input
      const filters: RoundFilters = filterFields
      const result = await listFundingRounds({ filters, cursor, limit })
      return { content: [{ type: 'text', text: JSON.stringify(result) }] }
    },
  )

  // --- get_funding_round -----------------------------------------------------
  server.tool(
    'get_funding_round',
    'Fetch a single funding round by UUID. Does NOT include CEO contact (call reveal_contact for that).',
    {
      id: z.string().uuid(),
    },
    async ({ id }) => {
      const denied = await gateTool(ctx, 'get_funding_round')
      if (denied) return { content: [{ type: 'text', text: JSON.stringify(denied) }], isError: true }

      const round = await getFundingRound(id)
      if (!round) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'not_found' }) }],
          isError: true,
        }
      }
      return { content: [{ type: 'text', text: JSON.stringify({ round }) }] }
    },
  )

  // --- search_companies ------------------------------------------------------
  server.tool(
    'search_companies',
    'Fuzzy company-name search (substring match). Returns recent rounds for matching companies.',
    {
      query: z.string().min(2).describe('Company name or partial name, ≥2 chars'),
      limit: z.number().int().min(1).max(50).default(10),
    },
    async ({ query, limit }) => {
      const denied = await gateTool(ctx, 'search_companies')
      if (denied) return { content: [{ type: 'text', text: JSON.stringify(denied) }], isError: true }

      const rounds = await searchCompanies(query, limit)
      return { content: [{ type: 'text', text: JSON.stringify({ rounds }) }] }
    },
  )

  // --- reveal_contact --------------------------------------------------------
  server.tool(
    'reveal_contact',
    'Reveal CEO contact (name, email, LinkedIn) for a funding round. Gated at 200/day. Every call is logged for audit.',
    {
      funding_round_id: z.string().uuid(),
    },
    async ({ funding_round_id }) => {
      const denied = await gateTool(ctx, 'reveal_contact')
      if (denied) return { content: [{ type: 'text', text: JSON.stringify(denied) }], isError: true }

      const contact = await revealContact({
        fundingRoundId: funding_round_id,
        keyId: ctx.keyId,
        userId: ctx.userId,
      })
      if (!contact) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: 'not_found' }) }],
          isError: true,
        }
      }
      return { content: [{ type: 'text', text: JSON.stringify({ contact }) }] }
    },
  )

  // --- whoami ----------------------------------------------------------------
  server.tool(
    'whoami',
    'Returns the calling key\'s plan, prefix, and remaining daily quotas.',
    {},
    async () => {
      // whoami is FREE — we do NOT call gateTool here; otherwise quota checks
      // can never recover. It's still subject to the parent /mcp 'mcp_request'
      // limit at the top of the route.
      const tools = Object.keys(DEFAULT_QUOTAS)
      const quotas = await Promise.all(
        tools.map(async (tool) => {
          const { used, day } = await getQuotaUsage(ctx.keyId, tool)
          const limit = DEFAULT_QUOTAS[tool]
          return { tool, used, limit, remaining: Math.max(0, limit - used), day }
        }),
      )
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              plan: ctx.profile.plan,
              email: ctx.profile.email,
              key_prefix: ctx.keyPrefix,
              quotas,
            }),
          },
        ],
      }
    },
  )

  return server
}

// ---------------------------------------------------------------------------
// HTTP entry points — all three forwarded to the transport's handleRequest()
// which implements the full MCP Streamable HTTP spec.
// ---------------------------------------------------------------------------

async function handle(req: NextRequest): Promise<Response> {
  if (mcpDisabled()) {
    return NextResponse.json(
      { error: 'mcp_disabled', message: 'The MCP service is temporarily disabled.' },
      { status: 503 },
    )
  }

  // Authenticate + take a slot on the parent /mcp counter. We use a coarse
  // 'mcp_request' counter (1000/day) on top of the per-tool counters so a
  // batched call that does 30 list+reveal still costs 30 mcp_request slots,
  // but a script that tries 10K initialize/tools-list pings runs out fast.
  const auth = await authenticateApiKey(req, 'mcp_request')
  if (!auth.ok) return auth.response

  const server = buildMcpServer(auth.ctx)
  const transport = new WebStandardStreamableHTTPServerTransport({
    // Stateless mode: no session ID, every request is independent.
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })
  await server.connect(transport)
  return transport.handleRequest(req)
}

export const GET = handle
export const POST = handle
export const DELETE = handle
