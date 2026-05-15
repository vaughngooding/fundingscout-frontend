import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FundingScout MCP / API Docs',
  description:
    'Connect FundingScout to Claude Code via the Model Context Protocol. Pull real-time funding rounds and CEO contact data during outbound automation.',
}

export default function McpDocsPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white antialiased">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            <span className="text-emerald-400">Funding</span>
            <span className="text-white">Scout</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup?plan=trial"
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-500"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
          Developer docs
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight sm:text-5xl">
          FundingScout MCP
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-400">
          Connect FundingScout to <strong className="text-white">Claude Code</strong>{' '}
          (or any MCP-compatible client) and let Claude pull funding rounds and CEO contact data
          during outbound automation.
        </p>
        <p className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-400">
          Building a server-to-server REST integration instead?{' '}
          <Link href="/docs/api" className="text-emerald-400 underline hover:text-emerald-300">
            See the REST API docs →
          </Link>{' '}
          (accounts/contacts sync, webhook delivery, match notifications).
        </p>

        {/* ===== Quick start ===== */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Quick start</h2>
          <ol className="mt-5 space-y-5 text-sm text-slate-300">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                1
              </span>
              <div>
                <p className="font-semibold text-white">Subscribe to FundingScout Pro</p>
                <p className="mt-1 text-slate-400">
                  API access is bundled into the Pro plan ($89/mo).{' '}
                  <Link href="/onboarding?step=plan" className="text-emerald-400 hover:underline">
                    Upgrade here
                  </Link>
                  .
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                2
              </span>
              <div>
                <p className="font-semibold text-white">Create an API key</p>
                <p className="mt-1 text-slate-400">
                  In <Link href="/settings" className="text-emerald-400 hover:underline">
                    Settings → API Keys
                  </Link>, click <strong className="text-slate-200">Create new key</strong>. The
                  full key is shown <strong className="text-amber-300">once</strong> — copy it
                  immediately.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                3
              </span>
              <div>
                <p className="font-semibold text-white">Add it to Claude Code</p>
                <div className="mt-2 rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-[11px] text-slate-300 break-all">
                  claude mcp add --transport http fundingscout https://fundingscout.io/mcp --header
                  &quot;Authorization: Bearer fs_live_...&quot;
                </div>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-300 flex items-center justify-center font-bold">
                4
              </span>
              <div>
                <p className="font-semibold text-white">Use it</p>
                <p className="mt-1 text-slate-400">
                  Just talk to Claude. Try:{' '}
                  <em className="text-slate-200">
                    &ldquo;Find 20 recent Series A B2B SaaS rounds in the US, reveal each CEO&apos;s
                    contact info, and draft a personalized cold email for each.&rdquo;
                  </em>
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* ===== Tools ===== */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">Tools</h2>
          <p className="mt-3 text-sm text-slate-400">
            Claude will auto-discover these. You don&apos;t need to call them by name — just
            describe what you want.
          </p>

          <div className="mt-6 space-y-5">
            <ToolDoc
              name="list_funding_rounds"
              quota="1,000 / day"
              description="List recent funding rounds, filtered by funding type, country, industry tags, amount range, and date range. Returns paginated results with an opaque cursor."
              params={[
                ['funding_type[]', 'string[]', 'e.g. ["seed", "series-a"]'],
                ['country[]', 'string[]', 'ISO codes, e.g. ["US", "CA"]'],
                ['industry[]', 'string[]', 'Tags, e.g. ["AI/ML", "FinTech"]'],
                ['min_amount, max_amount', 'integer', 'USD'],
                ['published_after, published_before', 'ISO date', ''],
                ['has_ceo_contact', 'boolean', 'true = only rounds with email known'],
                ['limit', 'integer', '1..100, default 25'],
                ['cursor', 'string', 'Opaque, from previous response'],
              ]}
            />
            <ToolDoc
              name="get_funding_round"
              quota="1,000 / day"
              description="Fetch a single round by UUID. Does NOT include CEO contact."
              params={[['id', 'UUID', 'Round ID']]}
            />
            <ToolDoc
              name="search_companies"
              quota="1,000 / day"
              description="Fuzzy substring match on company name. Returns recent rounds for matches."
              params={[
                ['query', 'string', '≥2 characters'],
                ['limit', 'integer', '1..50, default 10'],
              ]}
            />
            <ToolDoc
              name="reveal_contact"
              quota="200 / day"
              description="Reveal the CEO's name, email, and LinkedIn URL for a funding round. Every call is logged for audit. Lower quota than browse tools because CEO contact is the most sensitive data we expose."
              params={[['funding_round_id', 'UUID', 'Round ID']]}
            />
            <ToolDoc
              name="whoami"
              quota="1,000 / day"
              description="Returns your plan, key prefix, and remaining quota for every tool today. Useful for Claude to check before bulk operations."
              params={[]}
            />
          </div>
        </section>

        {/* ===== Quotas ===== */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">Quotas</h2>
          <p className="mt-3 text-sm leading-relaxed text-slate-400">
            Each tool has a daily quota that resets at <strong className="text-slate-300">00:00 UTC</strong>. When you exceed a quota, the tool returns{' '}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs">{`{"error":"over_quota","tool":"...","retry_after_seconds":N}`}</code>
            . Claude will receive this and stop calling that tool until the next day.
          </p>
          <p className="mt-3 text-sm text-slate-400">
            If your team needs higher limits, email{' '}
            <a href="mailto:info@fundingscout.io" className="text-emerald-400 hover:underline">
              info@fundingscout.io
            </a>
            .
          </p>
        </section>

        {/* ===== REST equivalents ===== */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">REST API</h2>
          <p className="mt-3 text-sm text-slate-400">
            Every MCP tool has a REST equivalent under <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs">https://fundingscout.io/api/v1/</code>.
            Use the same{' '}
            <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs">Authorization: Bearer fs_live_...</code>{' '}
            header.
          </p>
          <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-slate-300 space-y-1">
            <div>GET    /api/v1/rounds</div>
            <div>GET    /api/v1/rounds/{'{id}'}</div>
            <div>POST   /api/v1/rounds/{'{id}'}/contact</div>
            <div>GET    /api/v1/companies/search?q=...</div>
            <div>GET    /api/v1/whoami</div>
          </div>
        </section>

        {/* ===== Privacy / use ===== */}
        <section className="mt-16">
          <h2 className="text-2xl font-bold tracking-tight">Acceptable use</h2>
          <ul className="mt-4 space-y-2 text-sm text-slate-400 list-disc list-inside">
            <li>
              <strong className="text-slate-200">Do not redistribute or resell</strong> CEO
              contact data. Each reveal is for your own outreach, not a derived dataset for sale.
            </li>
            <li>
              <strong className="text-slate-200">Respect opt-outs.</strong> If a CEO asks to be
              removed, email us and we&apos;ll suppress them from your future reveals.
            </li>
            <li>
              <strong className="text-slate-200">No spam.</strong> Use the data for personalized,
              relevant outreach. Volume spam damages your sender reputation and ours.
            </li>
          </ul>
          <p className="mt-4 text-sm text-slate-400">
            See the full{' '}
            <Link href="/privacy" className="text-emerald-400 hover:underline">
              Privacy Policy
            </Link>{' '}
            for details on how we handle data.
          </p>
        </section>
      </main>
    </div>
  )
}

function ToolDoc({
  name,
  description,
  params,
  quota,
}: {
  name: string
  description: string
  params: Array<[string, string, string]>
  quota: string
}) {
  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/50 p-5">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <code className="font-mono text-base text-emerald-300">{name}</code>
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {quota}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{description}</p>
      {params.length > 0 && (
        <div className="mt-4 grid gap-2 text-xs">
          {params.map(([k, t, hint]) => (
            <div key={k} className="grid grid-cols-[1fr_auto_2fr] gap-3 items-baseline">
              <code className="font-mono text-slate-300">{k}</code>
              <span className="text-slate-500">{t}</span>
              <span className="text-slate-500">{hint}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
