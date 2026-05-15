import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FundingScout CRM Match API — Developer Docs',
  description:
    'Sync your CRM contacts and accounts to FundingScout. Get a webhook notification the moment a company in your pipeline raises funding. Turn cold news into warm intros.',
}

const KEY_HEADER = 'Authorization: Bearer fs_live_…'

export default function ApiDocsPage() {
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
              href="/docs/mcp"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              MCP Docs
            </Link>
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
          CRM Match API
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-slate-400">
          Sync your CRM contacts and accounts to FundingScout. The moment a
          company in your pipeline raises funding,{' '}
          <strong className="text-white">we POST a match to your webhook</strong>{' '}
          (or you pull it via the matches endpoint). Turn cold funding news
          into a warm-intro signal tied to relationships your reps already have.
        </p>

        {/* TOC */}
        <nav className="mt-8 rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-sm">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            On this page
          </p>
          <ul className="space-y-1.5 text-slate-300">
            <li><a href="#how-it-works" className="hover:text-emerald-400">1. How it works</a></li>
            <li><a href="#auth" className="hover:text-emerald-400">2. Authentication</a></li>
            <li><a href="#quickstart" className="hover:text-emerald-400">3. 5-minute quickstart</a></li>
            <li><a href="#accounts" className="hover:text-emerald-400">4. Resource: Accounts</a></li>
            <li><a href="#contacts" className="hover:text-emerald-400">5. Resource: Contacts</a></li>
            <li><a href="#webhooks" className="hover:text-emerald-400">6. Webhook delivery</a></li>
            <li><a href="#matches" className="hover:text-emerald-400">7. Pull endpoint: Matches</a></li>
            <li><a href="#match-logic" className="hover:text-emerald-400">8. How matches are detected</a></li>
            <li><a href="#errors" className="hover:text-emerald-400">9. Error codes</a></li>
          </ul>
        </nav>

        {/* ===== 1. How it works ===== */}
        <section id="how-it-works" className="mt-16">
          <h2 className="text-2xl font-bold">1. How it works</h2>
          <ol className="mt-4 space-y-3 text-slate-300">
            <li><strong className="text-white">Sync your CRM.</strong> POST your accounts (companies) and contacts (people) to FundingScout. You can sync up to 1,000 per request — most customers run a daily cron from their CRM.</li>
            <li><strong className="text-white">Register a webhook.</strong> Tell us where to POST match notifications when one of your accounts gets funded.</li>
            <li><strong className="text-white">Get warm intros.</strong> When a company in your pipeline raises, you get a webhook with the funding details + the matched account/contact from your CRM. Forward to the sales rep who owns the relationship.</li>
          </ol>
          <p className="mt-4 text-sm text-slate-500">
            Works with any CRM (Salesforce, HubSpot, Pipedrive, Attio, Close, custom in-house) — anything that can output JSON.
          </p>
        </section>

        {/* ===== 2. Auth ===== */}
        <section id="auth" className="mt-16">
          <h2 className="text-2xl font-bold">2. Authentication</h2>
          <p className="mt-3 text-slate-300">
            Every request must include an API key in the <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-emerald-300">Authorization</code> header:
          </p>
          <CodeBlock>
            {`${KEY_HEADER}`}
          </CodeBlock>
          <p className="mt-4 text-slate-300">
            Generate keys at{' '}
            <Link href="/settings" className="text-emerald-400 underline">Settings → API Keys</Link>.
            Pro subscription required. Keys start with <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-emerald-300">fs_live_</code> and are shown ONCE at creation — store securely.
          </p>
          <p className="mt-3 text-sm text-slate-500">
            Same key works for the CRM Match API, the MCP integration, and any future API surface — one credential, every product.
          </p>
        </section>

        {/* ===== 3. Quickstart ===== */}
        <section id="quickstart" className="mt-16">
          <h2 className="text-2xl font-bold">3. Five-minute quickstart</h2>
          <p className="mt-3 text-slate-300">
            A complete integration in 4 curl calls. Replace <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-emerald-300">$FS_KEY</code> with your <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-emerald-300">fs_live_…</code> key.
          </p>
          <CodeBlock>
{`# 1. Sync your CRM accounts (companies)
curl -X POST https://fundingscout.io/api/v1/accounts \\
  -H "Authorization: Bearer $FS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "accounts": [
      {"external_id": "001A1", "name": "Vellum AI",  "domain": "vellum.ai"},
      {"external_id": "001A2", "name": "Acme Corp",  "domain": "acme.com"}
    ]
  }'

# 2. Sync your CRM contacts (people)
curl -X POST https://fundingscout.io/api/v1/contacts \\
  -H "Authorization: Bearer $FS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contacts": [
      {"external_id":"003C1","email":"sarah@vellum.ai","first_name":"Sarah","account_external_id":"001A1"},
      {"external_id":"003C2","email":"jane@gmail.com","first_name":"Jane","account_external_id":"001A1"}
    ]
  }'

# 3. Register your webhook URL (HTTPS required)
curl -X POST https://fundingscout.io/api/v1/webhooks \\
  -H "Authorization: Bearer $FS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yourapp.example.com/hooks/fundingscout"}'

# 4. (Optional) Test by pulling matches directly:
curl https://fundingscout.io/api/v1/matches \\
  -H "Authorization: Bearer $FS_KEY"`}
          </CodeBlock>
          <p className="mt-4 text-sm text-slate-500">
            That&rsquo;s it. From this point forward, every funding round we ingest is matched against your synced accounts + contacts, and the matches are pushed to your webhook within 60 seconds of the press release hitting the wire.
          </p>
        </section>

        {/* ===== 4. Accounts ===== */}
        <section id="accounts" className="mt-16">
          <h2 className="text-2xl font-bold">4. Resource: Accounts</h2>
          <p className="mt-3 text-slate-300">
            Your CRM&rsquo;s companies/accounts. Idempotent upsert by <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-emerald-300">external_id</code>.
          </p>
          <h3 className="mt-6 text-lg font-semibold">POST /api/v1/accounts</h3>
          <CodeBlock>
{`{
  "accounts": [
    {
      "external_id": "0014x000007xY3oAAE",   // required: your CRM's account ID
      "name": "Vellum AI",                    // required
      "domain": "vellum.ai",                  // optional but recommended (highest match precision)
      "metadata": {                           // optional: passed through unchanged
        "industry": "AI",
        "owner_email": "rep@yourco.com"
      }
    }
  ]
}`}
          </CodeBlock>
          <p className="mt-3 text-sm text-slate-300">
            <strong className="text-white">Response:</strong> <code className="text-emerald-300">{`{ "upserted": N, "errors": [...] }`}</code>
          </p>
          <p className="mt-3 text-sm text-slate-300">
            <strong className="text-white">Limits:</strong> 1,000 accounts per request. For larger CRMs, paginate.
          </p>
          <h3 className="mt-6 text-lg font-semibold">DELETE /api/v1/accounts?external_id=001A1</h3>
          <p className="mt-2 text-sm text-slate-300">Removes a single account. Returns <code className="text-emerald-300">{`{ "deleted": 1 }`}</code>.</p>
        </section>

        {/* ===== 5. Contacts ===== */}
        <section id="contacts" className="mt-16">
          <h2 className="text-2xl font-bold">5. Resource: Contacts</h2>
          <p className="mt-3 text-slate-300">
            Your CRM&rsquo;s people. Link to an account via <code className="rounded bg-slate-800 px-1.5 py-0.5 text-sm text-emerald-300">account_external_id</code>. Idempotent upsert.
          </p>
          <h3 className="mt-6 text-lg font-semibold">POST /api/v1/contacts</h3>
          <CodeBlock>
{`{
  "contacts": [
    {
      "external_id": "0034x000007xY3oAAE",   // required
      "email": "sarah@vellum.ai",             // optional (used for email_domain matching)
      "first_name": "Sarah",                  // optional
      "last_name": "Park",                    // optional
      "account_external_id": "0014x...",      // optional: links to crm_accounts.external_id
      "metadata": { "title": "VP Sales" }     // optional
    }
  ]
}`}
          </CodeBlock>
          <p className="mt-3 text-sm text-slate-300">
            <strong className="text-white">Response:</strong> <code className="text-emerald-300">{`{ "upserted": N, "errors": [...] }`}</code> · <strong>Limit:</strong> 1,000 per request.
          </p>
        </section>

        {/* ===== 6. Webhooks ===== */}
        <section id="webhooks" className="mt-16">
          <h2 className="text-2xl font-bold">6. Webhook delivery</h2>
          <p className="mt-3 text-slate-300">
            Register one HTTPS URL. We POST a JSON payload to it within ~60 seconds of a funding round being ingested. Pass <code className="text-emerald-300">null</code> or <code className="text-emerald-300">&quot;&quot;</code> as the URL to clear (and switch to pull-only).
          </p>
          <h3 className="mt-6 text-lg font-semibold">POST /api/v1/webhooks</h3>
          <CodeBlock>
{`{ "url": "https://yourapp.example.com/hooks/fundingscout" }`}
          </CodeBlock>
          <h3 className="mt-6 text-lg font-semibold">Webhook payload (we POST this to you)</h3>
          <CodeBlock>
{`{
  "event": "funding_match",
  "match_id": "f1b2c3d4-...",
  "match_type": "account_domain",         // or "email_domain" or "account_name"
  "matched": {
    "account_external_id": "0014x000007xY3oAAE",
    "contact_external_id": null            // populated when match path is email_domain
  },
  "funding_round": {
    "id": "...",
    "company_name": "Vellum AI",
    "amount_usd": 20000000,
    "funding_type": "series-a",
    "website": "https://vellum.ai",
    "article_url": "https://www.businesswire.com/...",
    "article_title": "Vellum Raises $20M Series A...",
    "published_date": "2026-05-12",
    "ceo_name": "Akash Sharma",
    "ceo_email": "akash@vellum.ai",
    "ceo_linkedin_url": "https://linkedin.com/in/akash-sharma",
    "industry": "AI Infrastructure",
    "location": "San Francisco",
    "location_country": "US",
    "lead_investor": "Spark Capital",
    "investors": ["Spark Capital", "..."],
    "confidence_score": 0.95
  },
  "timestamp": "2026-05-12T01:54:00Z"
}`}
          </CodeBlock>
          <p className="mt-3 text-sm text-slate-500">
            Respond with any 2xx status to acknowledge. We retry once on 5xx (no retry on 4xx — fix the bug). Failed deliveries are visible via <code className="text-emerald-300">GET /api/v1/matches?status=failed</code> for manual recovery.
          </p>
        </section>

        {/* ===== 7. Matches ===== */}
        <section id="matches" className="mt-16">
          <h2 className="text-2xl font-bold">7. Pull endpoint: Matches</h2>
          <p className="mt-3 text-slate-300">
            For customers who can&rsquo;t host a webhook, or as a recovery mechanism. Returns paginated matches in reverse chronological order.
          </p>
          <h3 className="mt-6 text-lg font-semibold">GET /api/v1/matches</h3>
          <CodeBlock>
{`# Pull recent matches
curl -H "Authorization: Bearer $FS_KEY" \\
  "https://fundingscout.io/api/v1/matches?limit=100"

# Page using the cursor returned in the previous response
curl -H "Authorization: Bearer $FS_KEY" \\
  "https://fundingscout.io/api/v1/matches?since=2026-05-12T01:54:00Z&limit=100"

# Filter to just failed webhooks (for recovery)
curl -H "Authorization: Bearer $FS_KEY" \\
  "https://fundingscout.io/api/v1/matches?status=failed,no_webhook"`}
          </CodeBlock>
          <p className="mt-3 text-sm text-slate-300">
            <strong className="text-white">Response:</strong> <code className="text-emerald-300">{`{ "data": [...matches], "next_cursor": "<iso8601>" | null }`}</code>
          </p>
        </section>

        {/* ===== 8. Match logic ===== */}
        <section id="match-logic" className="mt-16">
          <h2 className="text-2xl font-bold">8. How matches are detected</h2>
          <p className="mt-3 text-slate-300">
            For each new funding round, we try three match paths in this order. The first hit wins; you get at most one notification per (your-CRM, funding-round) pair.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700 text-left text-slate-400">
                <tr><th className="py-2 pr-4">Path</th><th className="py-2 pr-4">Match key</th><th className="py-2">When it fires</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr><td className="py-3 pr-4"><code className="text-emerald-300">account_domain</code></td><td className="py-3 pr-4">crm_accounts.domain → funding website</td><td className="py-3">Highest precision. Your account&rsquo;s <code>vellum.ai</code> matches Vellum&rsquo;s funding round.</td></tr>
                <tr><td className="py-3 pr-4"><code className="text-emerald-300">email_domain</code></td><td className="py-3 pr-4">crm_contacts.email → funding website</td><td className="py-3">Contact&rsquo;s work email matches the funded company&rsquo;s domain. Free-mail domains (gmail, yahoo, etc.) are excluded.</td></tr>
                <tr><td className="py-3 pr-4"><code className="text-emerald-300">account_name</code></td><td className="py-3 pr-4">crm_accounts.name → funding company name</td><td className="py-3">Fallback for accounts where domain isn&rsquo;t populated. Normalized exact match.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ===== 9. Errors ===== */}
        <section id="errors" className="mt-16">
          <h2 className="text-2xl font-bold">9. Error codes</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-700 text-left text-slate-400">
                <tr><th className="py-2 pr-4">HTTP</th><th className="py-2 pr-4">code</th><th className="py-2">Meaning</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                <tr><td className="py-3 pr-4">401</td><td className="py-3 pr-4"><code>missing_authorization</code></td><td className="py-3">No Authorization header.</td></tr>
                <tr><td className="py-3 pr-4">401</td><td className="py-3 pr-4"><code>invalid_or_revoked_key</code></td><td className="py-3">Key doesn&rsquo;t match, or was revoked at Settings → API Keys.</td></tr>
                <tr><td className="py-3 pr-4">403</td><td className="py-3 pr-4"><code>pro_required</code></td><td className="py-3">API access requires a Pro subscription.</td></tr>
                <tr><td className="py-3 pr-4">400</td><td className="py-3 pr-4"><code>invalid_json</code> / <code>invalid_body</code></td><td className="py-3">Body shape wrong.</td></tr>
                <tr><td className="py-3 pr-4">400</td><td className="py-3 pr-4"><code>batch_too_large</code></td><td className="py-3">More than 1,000 items in one request.</td></tr>
                <tr><td className="py-3 pr-4">400</td><td className="py-3 pr-4"><code>invalid_url</code></td><td className="py-3">Webhook URL must be HTTPS, not localhost.</td></tr>
                <tr><td className="py-3 pr-4">429</td><td className="py-3 pr-4"><code>quota_exceeded</code></td><td className="py-3">Daily quota for this endpoint hit. Retries reset at UTC midnight.</td></tr>
                <tr><td className="py-3 pr-4">500</td><td className="py-3 pr-4"><code>db_error</code></td><td className="py-3">Our problem — we&rsquo;ll see it in logs. Retry safely.</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <div className="mt-20 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 p-8">
          <h2 className="text-2xl font-bold">Ready to integrate?</h2>
          <p className="mt-3 text-slate-300">
            Generate an API key at{' '}
            <Link href="/settings" className="text-emerald-400 underline">Settings → API Keys</Link>,{' '}
            then follow the quickstart above. Need help? Email{' '}
            <a href="mailto:api@fundingscout.io" className="text-emerald-400 underline">api@fundingscout.io</a>.
          </p>
        </div>
      </main>
    </div>
  )
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-5 text-[13px] leading-relaxed text-slate-200">
      <code>{children}</code>
    </pre>
  )
}
