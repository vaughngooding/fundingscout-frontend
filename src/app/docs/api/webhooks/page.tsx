import Link from 'next/link'
import type { Metadata } from 'next'
import CodeBlock, { InlineCode } from '../_CodeBlock'

export const metadata: Metadata = {
  title: 'Webhooks — FundingScout CRM Match API',
  description:
    'Register an HTTPS endpoint and receive match notifications when companies in your CRM raise funding.',
}

export default function Webhooks() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
        Resource
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Webhooks</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-400">
        Register one HTTPS URL. FundingScout POSTs a match payload to it
        within ~60 seconds of any funding round matching your synced
        accounts/contacts. Don&apos;t want to host a webhook? Use the{' '}
        <Link href="/docs/api/matches" className="text-emerald-400 underline">
          pull endpoint
        </Link>{' '}
        instead.
      </p>

      <h2 className="mt-12 text-2xl font-bold">POST /api/v1/webhooks</h2>
      <p className="mt-3 text-slate-300">
        Set or update your webhook URL. The URL must be HTTPS.
      </p>
      <CodeBlock>
{`curl -X POST https://fundingscout.io/api/v1/webhooks \\
  -H "Authorization: Bearer $FS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yourapp.example.com/hooks/fundingscout"}'

# Response:
# { "webhook_url": "https://yourapp.example.com/hooks/fundingscout" }`}
      </CodeBlock>

      <h3 className="mt-8 text-lg font-semibold">Clearing the webhook</h3>
      <p className="mt-3 text-slate-300">
        Pass <InlineCode>null</InlineCode> or empty string to switch to pull-only mode:
      </p>
      <CodeBlock>
{`curl -X POST https://fundingscout.io/api/v1/webhooks \\
  -H "Authorization: Bearer $FS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": null}'

# Response: { "webhook_url": null }`}
      </CodeBlock>

      <h2 className="mt-12 text-2xl font-bold">GET /api/v1/webhooks</h2>
      <p className="mt-3 text-slate-300">Read your current webhook URL.</p>
      <CodeBlock>
{`curl https://fundingscout.io/api/v1/webhooks \\
  -H "Authorization: Bearer $FS_KEY"

# Response: { "webhook_url": "https://..." | null }`}
      </CodeBlock>

      <h2 className="mt-14 text-2xl font-bold">Webhook payload</h2>
      <p className="mt-3 text-slate-300">
        This is what FundingScout POSTs to your endpoint when a match fires:
      </p>
      <CodeBlock>
{`POST https://yourapp.example.com/hooks/fundingscout
Content-Type: application/json
User-Agent: FundingScout-Webhook/1.0
X-FundingScout-Signature: sha256=<hex>      // see "Verifying signatures" below

{
  "event": "funding_match",
  "match_id": "f1b2c3d4-...",
  "match_type": "account_domain",        // "account_domain" | "email_domain" | "account_name"
  "matched": {
    "account_external_id": "0014x000007xY3oAAE",
    "contact_external_id": null,          // populated when match_type is "email_domain"
    "account_metadata": {                 // verbatim JSONB you sent on POST /accounts
      "alphaflow_customer_id": "vc_42"
    },
    "contact_metadata": null              // verbatim JSONB from POST /contacts (or null)
  },
  "funding_round": {
    "id": "9e34cb64-...",
    "company_name": "Vellum AI",
    "amount_usd": 20000000,
    "funding_type": "series-a",
    "website": "https://vellum.ai",
    "article_url": "https://www.businesswire.com/...",
    "article_title": "Vellum Raises $20M Series A...",
    "published_date": "2026-05-12",
    "ceo_name": "Akash Sharma",
    "ceo_email": "akash@vellum.ai",      // may be null if enrichment hasn't run yet
    "ceo_linkedin_url": "https://linkedin.com/in/akash-sharma",
    "industry": "AI Infrastructure",
    "location": "San Francisco",
    "location_country": "US",
    "lead_investor": "Spark Capital",
    "investors": ["Spark Capital", "Sequoia", "..."],
    "confidence_score": 0.95
  },
  "timestamp": "2026-05-12T01:54:00Z"
}`}
      </CodeBlock>

      <h2 className="mt-12 text-2xl font-bold">Required response</h2>
      <p className="mt-3 text-slate-300">
        Respond with any 2xx status code (200, 201, 204) to acknowledge. Response body is ignored
        but logged for debugging. We expect a response within{' '}
        <strong className="text-white">5 seconds</strong> — slower than that
        and we consider the delivery failed.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Verifying signatures (HMAC)</h2>
      <p className="mt-3 text-slate-300">
        Every webhook is signed with HMAC-SHA256 using the webhook secret
        (<InlineCode>fs_whsec_...</InlineCode>) shown to you once when your
        API key was created. The signature is sent in the{' '}
        <InlineCode>X-FundingScout-Signature</InlineCode> header as{' '}
        <InlineCode>sha256=&lt;hex&gt;</InlineCode>. Recompute the same value
        on your side and compare to confirm the request is from us and the
        body wasn&apos;t tampered with.
      </p>
      <p className="mt-3 text-sm text-slate-400">
        Lost your secret? Rotate it under{' '}
        <Link href="/settings" className="text-emerald-400 underline">Settings → API Keys</Link>{' '}
        — the old one stops working immediately, so coordinate with your
        webhook receiver before rotating in production.
      </p>

      <h3 className="mt-6 text-lg font-semibold">Node.js / Express</h3>
      <CodeBlock>
{`import crypto from 'node:crypto'
import express from 'express'

const app = express()
const WEBHOOK_SECRET = process.env.FS_WEBHOOK_SECRET  // fs_whsec_...

// IMPORTANT: capture the RAW body — JSON.parse() loses whitespace which
// invalidates the signature.
app.post('/hooks/fundingscout',
  express.raw({ type: 'application/json' }),
  (req, res) => {
    const expected = 'sha256=' + crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(req.body)                                 // Buffer of raw body
      .digest('hex')

    const got = req.header('X-FundingScout-Signature') || ''
    if (
      got.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(got))
    ) {
      return res.status(401).send('invalid signature')
    }

    const payload = JSON.parse(req.body.toString('utf8'))
    // ...process the funding_match event
    res.status(200).send('ok')
  })`}
      </CodeBlock>

      <h3 className="mt-6 text-lg font-semibold">Python / FastAPI</h3>
      <CodeBlock>
{`import hmac, hashlib, os
from fastapi import FastAPI, Request, HTTPException

app = FastAPI()
WEBHOOK_SECRET = os.environ['FS_WEBHOOK_SECRET']  # fs_whsec_...

@app.post('/hooks/fundingscout')
async def fundingscout(request: Request):
    raw_body = await request.body()                  # bytes
    expected = 'sha256=' + hmac.new(
        WEBHOOK_SECRET.encode(),
        raw_body,
        hashlib.sha256,
    ).hexdigest()
    got = request.headers.get('X-FundingScout-Signature', '')
    if not hmac.compare_digest(expected, got):
        raise HTTPException(status_code=401, detail='invalid signature')

    payload = await request.json()
    # ...process the funding_match event
    return {'ok': True}`}
      </CodeBlock>

      <h2 className="mt-12 text-2xl font-bold">Delivery semantics</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
        <li>
          <strong className="text-white">At-most-once.</strong> We won&apos;t double-fire for the same{' '}
          <InlineCode>(your_user_id, funding_round_id)</InlineCode> pair, even if multiple match paths fire.
        </li>
        <li>
          <strong className="text-white">No automatic retries today.</strong> If your endpoint returns 4xx/5xx or times out, the match is marked <InlineCode>failed</InlineCode> but no retry happens. Recover via the{' '}
          <Link href="/docs/api/matches" className="text-emerald-400 underline">pull endpoint</Link> with <InlineCode>?status=failed</InlineCode>.
        </li>
        <li>
          <strong className="text-white">~60 second latency.</strong> Our press-monitoring pipeline runs every minute. From the moment a funding article hits the wire to your webhook firing: usually under 60 seconds.
        </li>
        <li>
          <strong className="text-white">HMAC-SHA256 signed.</strong> Verify via the{' '}
          <InlineCode>X-FundingScout-Signature</InlineCode> header using the secret shown at key creation. See the snippets above.
        </li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold">Recommended receiver pattern</h2>
      <p className="mt-3 text-slate-300">
        Keep your handler fast (under 1 second). Don&apos;t do expensive
        work synchronously — enqueue it and return 200 immediately.
      </p>
      <CodeBlock>
{`// Node.js / Express example
app.post('/hooks/fundingscout', async (req, res) => {
  // 1. Acknowledge fast
  res.status(200).send('ok')

  // 2. Process async — don't block the webhook response
  const { match_type, matched, funding_round } = req.body

  // 3. Route to your downstream system
  if (matched.contact_external_id) {
    await sendSlackAlertToContactOwner(matched.contact_external_id, funding_round)
  } else if (matched.account_external_id) {
    await createCRMTaskForAccount(matched.account_external_id, funding_round)
  }
})`}
      </CodeBlock>

      <h2 className="mt-12 text-2xl font-bold">URL validation</h2>
      <p className="mt-3 text-slate-300">
        We reject obviously-bad URLs at registration time:
      </p>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-300">
        <li>Must be HTTPS (http:// is rejected)</li>
        <li>Cannot be <InlineCode>localhost</InlineCode>, <InlineCode>127.0.0.1</InlineCode>, or <InlineCode>::1</InlineCode></li>
        <li>Cannot end in <InlineCode>.local</InlineCode> (mDNS hostnames are dev-only)</li>
      </ul>
    </div>
  )
}
