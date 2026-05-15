import Link from 'next/link'
import type { Metadata } from 'next'
import CodeBlock, { InlineCode } from '../_CodeBlock'

export const metadata: Metadata = {
  title: 'Quickstart — FundingScout CRM Match API',
  description:
    '5-minute integration: sync your CRM, register a webhook, start receiving warm-intro signals.',
}

export default function Quickstart() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">Getting started</p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">5-minute quickstart</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-400">
        A complete integration in 4 curl calls. By the end of this page,
        you&apos;ll have a working pipeline: your CRM data flowing into
        FundingScout, and funding-event webhooks flowing back.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Prerequisites</h2>
      <ul className="mt-3 space-y-2 text-slate-300">
        <li>
          A FundingScout <strong className="text-white">Pro subscription</strong>{' '}
          (
          <Link href="/settings" className="text-emerald-400 underline">
            upgrade in Settings
          </Link>
          )
        </li>
        <li>
          An API key starting with <InlineCode>fs_live_</InlineCode> from{' '}
          <Link href="/settings" className="text-emerald-400 underline">
            Settings → API Keys
          </Link>
        </li>
        <li>
          An HTTPS endpoint you control (for the webhook) — or skip and use{' '}
          <Link href="/docs/api/matches" className="text-emerald-400 underline">
            polling
          </Link>
        </li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold">Step 1 — Sync your accounts (companies)</h2>
      <p className="mt-3 text-slate-300">
        Push up to 1,000 accounts per request. Upsert key is{' '}
        <InlineCode>external_id</InlineCode>, so repeat calls are idempotent.
      </p>
      <CodeBlock>
{`export FS_KEY="fs_live_..."

curl -X POST https://fundingscout.io/api/v1/accounts \\
  -H "Authorization: Bearer $FS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "accounts": [
      {"external_id": "001A1", "name": "Vellum AI",  "domain": "vellum.ai"},
      {"external_id": "001A2", "name": "Acme Corp",  "domain": "acme.com"}
    ]
  }'

# Response:
# { "upserted": 2, "errors": [] }`}
      </CodeBlock>

      <h2 className="mt-12 text-2xl font-bold">Step 2 — Sync your contacts (people)</h2>
      <p className="mt-3 text-slate-300">
        Link contacts to accounts via{' '}
        <InlineCode>account_external_id</InlineCode>. Contacts with personal
        email (e.g., <InlineCode>@gmail.com</InlineCode>) still match through
        their account.
      </p>
      <CodeBlock>
{`curl -X POST https://fundingscout.io/api/v1/contacts \\
  -H "Authorization: Bearer $FS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "contacts": [
      {
        "external_id": "003C1",
        "email": "sarah@vellum.ai",
        "first_name": "Sarah",
        "account_external_id": "001A1"
      },
      {
        "external_id": "003C2",
        "email": "jane@gmail.com",
        "first_name": "Jane",
        "account_external_id": "001A1"
      }
    ]
  }'

# Response:
# { "upserted": 2, "errors": [] }`}
      </CodeBlock>

      <h2 className="mt-12 text-2xl font-bold">Step 3 — Register your webhook</h2>
      <p className="mt-3 text-slate-300">
        HTTPS required. Pass <InlineCode>null</InlineCode> or{' '}
        <InlineCode>&quot;&quot;</InlineCode> to clear and switch to pull-only mode.
      </p>
      <CodeBlock>
{`curl -X POST https://fundingscout.io/api/v1/webhooks \\
  -H "Authorization: Bearer $FS_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://yourapp.example.com/hooks/fundingscout"}'

# Response:
# { "webhook_url": "https://yourapp.example.com/hooks/fundingscout" }`}
      </CodeBlock>

      <h2 className="mt-12 text-2xl font-bold">Step 4 — Verify</h2>
      <p className="mt-3 text-slate-300">
        Pull current matches via the polling endpoint. It&apos;ll be empty if no
        company in your CRM has been funded since you synced.
      </p>
      <CodeBlock>
{`curl https://fundingscout.io/api/v1/matches \\
  -H "Authorization: Bearer $FS_KEY"

# Response:
# { "data": [], "next_cursor": null }`}
      </CodeBlock>

      <h2 className="mt-12 text-2xl font-bold">That&apos;s it</h2>
      <p className="mt-3 text-slate-300">
        From now on: every funding round we ingest is matched against your
        accounts + contacts. Matches POST to your webhook within ~60 seconds.
      </p>

      <div className="mt-10 rounded-xl border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="font-semibold text-white">What to read next</h3>
        <ul className="mt-3 space-y-2 text-sm text-slate-300">
          <li>
            <Link href="/docs/api/webhooks" className="text-emerald-400 underline">
              Webhooks
            </Link>{' '}
            — the exact JSON payload you&apos;ll receive
          </li>
          <li>
            <Link href="/docs/api/match-logic" className="text-emerald-400 underline">
              How matches work
            </Link>{' '}
            — the three match paths
          </li>
          <li>
            <Link href="/docs/api/errors" className="text-emerald-400 underline">
              Error codes
            </Link>{' '}
            — what each 4xx/5xx means
          </li>
        </ul>
      </div>
    </div>
  )
}
