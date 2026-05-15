import Link from 'next/link'
import type { Metadata } from 'next'
import CodeBlock, { InlineCode } from '../_CodeBlock'

export const metadata: Metadata = {
  title: 'Partner quickstart — FundingScout CRM Match API',
  description:
    'Reseller integration guide for wholesale partners syncing multiple end-customer CRMs into FundingScout.',
}

export default function PartnerQuickstart() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
        Reseller integration
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
        Partner quickstart
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-400">
        For wholesale partners syncing <strong className="text-white">multiple end-customer CRMs</strong>{' '}
        into FundingScout. By the end of this page, you&apos;ll have funding-event
        signals flowing into your platform — tagged per end-customer so you can
        route them downstream.
      </p>
      <p className="mt-3 text-sm text-slate-500">
        Building for your own team&apos;s pipeline instead?{' '}
        <Link href="/docs/api/quickstart" className="text-emerald-400 underline">
          Use the standard 5-minute quickstart
        </Link>{' '}
        — it&apos;s simpler.
      </p>

      <h2 className="mt-12 text-2xl font-bold">The architecture in 30 seconds</h2>
      <p className="mt-3 text-slate-300">
        You don&apos;t need to give us access to your end-customers&apos; CRMs.
        Instead:
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-6 text-slate-300">
        <li>
          Once a day, push each end-customer&apos;s pipeline (the companies they
          care about) to us via <InlineCode>POST /accounts</InlineCode>. Tag each row with their ID.
        </li>
        <li>
          We continuously monitor funding rounds (press releases, SEC filings, RSS feeds).
        </li>
        <li>
          When a funded company matches one of your customers&apos; pipeline rows, we POST a webhook to your endpoint within ~60 seconds. The payload includes the end-customer tag so you know who to route it to.
        </li>
      </ol>
      <p className="mt-3 text-slate-300">
        That&apos;s it. The match engine runs entirely on our side. You only deal with two surfaces: <strong className="text-white">push your CRM snapshot to us, receive webhooks back.</strong>
      </p>

      <h2 className="mt-12 text-2xl font-bold">Prerequisites</h2>
      <ul className="mt-3 space-y-2 text-slate-300">
        <li>
          An API key from{' '}
          <Link href="/settings" className="text-emerald-400 underline">
            Settings → API Keys
          </Link>{' '}
          — when you create the key you&apos;ll see both an{' '}
          <InlineCode>fs_live_...</InlineCode> token AND an{' '}
          <InlineCode>fs_whsec_...</InlineCode> webhook signing secret. Save
          both. Neither is shown again.
        </li>
        <li>
          An HTTPS endpoint on your server that will receive POST payloads. We&apos;ll
          set its URL via API in step 3.
        </li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold">Step 1 — Sync your customers&apos; pipelines</h2>
      <p className="mt-3 text-slate-300">
        Each row in the batch carries a{' '}
        <InlineCode>metadata.partner_customer_id</InlineCode> tag identifying
        which of your end-customers owns it. Use whatever ID format you already
        have (UUID, your CRM&apos;s internal ID, an email, anything). It comes
        back verbatim in every match webhook so you can route to the right
        customer.
      </p>
      <CodeBlock>
{`curl -X POST https://fundingscout.io/api/v1/accounts \\
  -H "Authorization: Bearer $FS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "accounts": [
      {
        "external_id": "vc42-acme",
        "name": "Acme Corp",
        "domain": "acme.com",
        "metadata": { "partner_customer_id": "vc_42" }
      },
      {
        "external_id": "vc42-vellum",
        "name": "Vellum AI",
        "domain": "vellum.ai",
        "metadata": { "partner_customer_id": "vc_42" }
      },
      {
        "external_id": "vc43-stripe",
        "name": "Stripe",
        "domain": "stripe.com",
        "metadata": { "partner_customer_id": "vc_43" }
      }
    ]
  }'

# Response: { "upserted": 3, "errors": [] }`}
      </CodeBlock>

      <p className="mt-3 text-slate-300">
        <strong className="text-white">Batch up to 1,000 accounts per call.</strong> Mix end-customers in the same batch — the metadata tag handles routing. Idempotent on{' '}
        <InlineCode>external_id</InlineCode>: send the same row again with updated fields, and we&apos;ll update the existing record instead of creating a duplicate.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Step 2 — Register your webhook receiver</h2>
      <CodeBlock>
{`curl -X POST https://fundingscout.io/api/v1/webhooks \\
  -H "Authorization: Bearer $FS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yourapp.example.com/hooks/fundingscout"}'

# Response: { "webhook_url": "https://yourapp.example.com/hooks/fundingscout" }`}
      </CodeBlock>

      <h2 className="mt-12 text-2xl font-bold">Step 3 — Receive + verify match webhooks</h2>
      <p className="mt-3 text-slate-300">
        When we detect a match, we POST this to your URL:
      </p>
      <CodeBlock>
{`POST https://yourapp.example.com/hooks/fundingscout
Content-Type: application/json
X-FundingScout-Signature: sha256=<hex>

{
  "event": "funding_match",
  "match_id": "f1b2c3d4-...",
  "match_type": "account_domain",
  "matched": {
    "account_external_id": "vc42-vellum",
    "account_metadata": { "partner_customer_id": "vc_42" },
    "contact_external_id": null,
    "contact_metadata": null
  },
  "funding_round": {
    "id": "9e34cb64-...",
    "company_name": "Vellum AI",
    "amount_usd": 20000000,
    "funding_type": "series-a",
    "website": "https://vellum.ai",
    "article_url": "https://www.businesswire.com/...",
    "published_date": "2026-05-12",
    "ceo_name": "Akash Sharma",
    "industry": "AI Infrastructure",
    "investors": ["Spark Capital", "Sequoia"],
    "confidence_score": 0.95
  },
  "timestamp": "2026-05-12T01:54:00Z"
}`}
      </CodeBlock>

      <p className="mt-4 text-slate-300">
        <strong className="text-white">Always verify the signature.</strong> The{' '}
        <InlineCode>X-FundingScout-Signature</InlineCode> header is{' '}
        <InlineCode>sha256=&lt;hex&gt;</InlineCode> where the hex is{' '}
        <InlineCode>HMAC-SHA256(your_webhook_secret, raw_request_body)</InlineCode>. Verifying confirms the request is from us and the body wasn&apos;t tampered with.
      </p>

      <h3 className="mt-6 text-lg font-semibold">Node.js / Express receiver</h3>
      <CodeBlock>
{`import crypto from 'node:crypto'
import express from 'express'

const app = express()
const WEBHOOK_SECRET = process.env.FS_WEBHOOK_SECRET  // fs_whsec_...

// IMPORTANT: capture the RAW body — JSON.parse() loses whitespace
// which invalidates the signature.
app.post('/hooks/fundingscout',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const expected = 'sha256=' + crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(req.body)
      .digest('hex')

    const got = req.header('X-FundingScout-Signature') || ''
    if (
      got.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got))
    ) {
      return res.status(401).send('invalid signature')
    }

    const payload = JSON.parse(req.body.toString('utf8'))
    const customerId = payload.matched.account_metadata?.partner_customer_id

    // Route to the right end-customer's downstream pipeline
    enqueueOutreachJob(customerId, payload.funding_round)

    res.status(200).send('ok')
  })`}
      </CodeBlock>

      <h3 className="mt-6 text-lg font-semibold">Python / FastAPI receiver</h3>
      <CodeBlock>
{`import hmac, hashlib, os
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = os.environ['FS_WEBHOOK_SECRET']  # fs_whsec_...

@app.post('/hooks/fundingscout')
async def fundingscout(request: Request):
    raw_body = await request.body()
    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    got = request.headers.get('X-FundingScout-Signature', '')
    if not hmac.compare_digest(expected, got):
        raise HTTPException(status_code=401, detail='invalid signature')

    payload = await request.json()
    customer_id = (payload['matched'].get('account_metadata') or {}).get('partner_customer_id')

    # Route to the right end-customer's downstream pipeline
    enqueue_outreach_job(customer_id, payload['funding_round'])

    return {'ok': True}`}
      </CodeBlock>

      <p className="mt-4 text-sm text-slate-400">
        Respond with any 2xx status within <strong className="text-white">5 seconds</strong>.
        Slower = we mark the delivery failed (recoverable — see Step 5). Do
        heavy work async after returning 200.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Step 4 — Daily sync template</h2>
      <p className="mt-3 text-slate-300">
        Run this once a day from your backend. Fresh snapshot of every end-customer&apos;s pipeline, batched into chunks of 1,000:
      </p>
      <CodeBlock>
{`// Node.js cron at 2 AM daily — sync all customers' CRMs
async function dailyAccountSync() {
  const allAccounts = []

  for (const customer of await listOurCustomers()) {
    const companies = await fetchCustomerCRM(customer.id)
    for (const c of companies) {
      allAccounts.push({
        external_id: \`\${customer.id}-\${c.id}\`,  // namespaced per-customer
        name: c.name,
        domain: c.domain,
        metadata: { partner_customer_id: customer.id },
      })
    }
  }

  // Chunk into batches of 1,000 — the API's max per call
  for (let i = 0; i < allAccounts.length; i += 1000) {
    const batch = allAccounts.slice(i, i + 1000)
    await fetch('https://fundingscout.io/api/v1/accounts', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${process.env.FS_KEY}\`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ accounts: batch }),
    })
  }
}`}
      </CodeBlock>

      <p className="mt-3 text-slate-300">
        5 customers × 1,000 companies each = 5 API calls per daily sync. Well
        under the 100/day default cap.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Step 5 — Recovery (optional)</h2>
      <p className="mt-3 text-slate-300">
        If your webhook receiver was down for any reason, fetch missed matches
        the next day via the pull endpoint:
      </p>
      <CodeBlock>
{`curl "https://fundingscout.io/api/v1/matches?status=failed&since=2026-05-15T00:00:00Z" \\
  -H "Authorization: Bearer $FS_KEY"

# Returns up to 200 matches per page. Use ?since=<next_cursor> to paginate.`}
      </CodeBlock>

      <h2 className="mt-12 text-2xl font-bold">Multi-tenant routing pattern</h2>
      <p className="mt-3 text-slate-300">
        The metadata tag round-trips through our system unchanged. Whatever you set on upload comes back on the webhook:
      </p>
      <div className="my-4 rounded-xl border border-slate-800 bg-slate-950/90 p-5 text-sm text-slate-200">
        <pre>{`Upload (your → us):
  POST /accounts
  { "metadata": { "partner_customer_id": "vc_42" } }
                                  │
                                  ▼
                  [stored in our crm_accounts.metadata]
                                  │
                                  ▼
Webhook (us → you):
  POST your-url
  { "matched": { "account_metadata": { "partner_customer_id": "vc_42" } } }
                                  │
                                  ▼
                  [your code routes by partner_customer_id]`}</pre>
      </div>
      <p className="mt-3 text-slate-300">
        Put whatever you want in <InlineCode>metadata</InlineCode> — it&apos;s a
        JSONB pass-through. We don&apos;t look at the contents. Common
        additions: <InlineCode>partner_customer_id</InlineCode>,{' '}
        <InlineCode>owner_email</InlineCode>,{' '}
        <InlineCode>tier</InlineCode>,{' '}
        <InlineCode>added_at</InlineCode>.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Rate limits + scaling</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 text-left text-slate-400">
            <tr>
              <th className="py-2 pr-4">Endpoint</th>
              <th className="py-2 pr-4">Default</th>
              <th className="py-2 pr-4">Per call</th>
              <th className="py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            <tr>
              <td className="py-3 pr-4"><InlineCode>POST /accounts</InlineCode></td>
              <td className="py-3 pr-4">100/day</td>
              <td className="py-3 pr-4">1,000 records</td>
              <td className="py-3">100k records/day available at default</td>
            </tr>
            <tr>
              <td className="py-3 pr-4"><InlineCode>POST /contacts</InlineCode></td>
              <td className="py-3 pr-4">100/day</td>
              <td className="py-3 pr-4">1,000 records</td>
              <td className="py-3">Deferred for v1 — see below</td>
            </tr>
            <tr>
              <td className="py-3 pr-4"><InlineCode>GET /matches</InlineCode></td>
              <td className="py-3 pr-4">100/day</td>
              <td className="py-3 pr-4">200 matches</td>
              <td className="py-3">Use for recovery, not primary delivery</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">Webhook delivery (us → you)</td>
              <td className="py-3 pr-4">Unlimited</td>
              <td className="py-3 pr-4">—</td>
              <td className="py-3">Realistic volume: 5–50 matches/day</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-4 text-slate-300">
        Need higher limits? Email <a href="mailto:api@fundingscout.io" className="text-emerald-400 underline">api@fundingscout.io</a> with your expected volume. We&apos;ll lift your per-key caps. <strong className="text-white">No surprise bills</strong> — pricing changes are discussed before they hit.
      </p>

      <h2 className="mt-12 text-2xl font-bold">What&apos;s not in v1</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
        <li>
          <strong className="text-white">Contacts sync is deferred.</strong>{' '}
          Most VCs track companies as accounts (with domains), so account-level
          matching catches the bulk of useful signals. We can add contacts later
          if you want to surface lower-pipeline relationships (people the VC met
          but hasn&apos;t formally added to pipeline).
        </li>
        <li>
          <strong className="text-white">No CEO email guarantees.</strong>{' '}
          Our funding round payload includes <InlineCode>ceo_name</InlineCode> on
          most rounds and <InlineCode>ceo_email</InlineCode> on a subset (where
          enrichment has run). Don&apos;t architect around it being present 100%
          of the time.
        </li>
        <li>
          <strong className="text-white">No inbound CRM webhooks.</strong>{' '}
          We don&apos;t consume webhooks from HubSpot/Salesforce/etc. Daily push
          sync is the integration pattern. Sub-minute freshness isn&apos;t needed
          for our match cadence anyway — funding rounds happen on a
          slower-than-hourly clock.
        </li>
        <li>
          <strong className="text-white">No OAuth into your customers&apos; CRMs.</strong>{' '}
          You handle CRM connections on your side. We never touch your
          customers&apos; Salesforce / HubSpot / DealCloud / Affinity directly —
          you stay in the middle.
        </li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold">Pricing</h2>
      <p className="mt-3 text-slate-300">
        Pro tier ($89/mo) covers default usage. If your usage requires lifted
        rate limits, custom features, or dedicated infrastructure, we&apos;ll
        move you to a wholesale tier — discussed and agreed in writing before
        any pricing change. Email{' '}
        <a href="mailto:api@fundingscout.io" className="text-emerald-400 underline">
          api@fundingscout.io
        </a>{' '}
        with questions.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Reference</h2>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-slate-300">
        <li>
          <Link href="/docs/api/accounts" className="text-emerald-400 underline">
            POST /accounts
          </Link>{' '}
          — full field reference
        </li>
        <li>
          <Link href="/docs/api/webhooks" className="text-emerald-400 underline">
            Webhooks
          </Link>{' '}
          — payload schema + signature verification details
        </li>
        <li>
          <Link href="/docs/api/matches" className="text-emerald-400 underline">
            GET /matches
          </Link>{' '}
          — pull endpoint with cursor pagination
        </li>
        <li>
          <Link href="/docs/api/match-logic" className="text-emerald-400 underline">
            How matches work
          </Link>{' '}
          — the three match paths + normalization rules
        </li>
        <li>
          <Link href="/docs/api/errors" className="text-emerald-400 underline">
            Errors
          </Link>{' '}
          — HTTP status codes + error response shapes
        </li>
      </ul>
    </div>
  )
}
