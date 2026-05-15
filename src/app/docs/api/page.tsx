import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FundingScout CRM Match API — Overview',
  description:
    'Sync your CRM contacts and accounts to FundingScout. Get notified the moment a company in your pipeline raises funding. Turn cold news into warm intros.',
}

export default function ApiDocsOverview() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
        CRM Match API
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
        Turn funding news into warm intros
      </h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-400">
        Sync your CRM contacts and accounts to FundingScout. The moment a
        company in your pipeline raises funding, we POST a webhook to your
        endpoint with the match details — so your reps can reach out to the
        relationships they already have, before the press release hits the
        wire.
      </p>

      {/* Three cards: who, what, why */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        <Card emoji="🎯" title="Who it's for">
          Sales teams using a CRM (Salesforce, HubSpot, Pipedrive, Attio, Close,
          custom). Anyone who already tracks contacts but learns about funding
          events too late.
        </Card>
        <Card emoji="⚡" title="What you get">
          Real-time webhook notifications when one of your accounts gets funded.
          Includes the funding details + the matched contact/account from your CRM.
        </Card>
        <Card emoji="🛠️" title="What you build">
          A daily cron that pushes your CRM data to two endpoints, plus a
          webhook receiver. Most customers integrate in &lt; 1 hour.
        </Card>
      </div>

      <h2 className="mt-14 text-2xl font-bold">How it works</h2>
      <ol className="mt-4 space-y-3 text-slate-300">
        <li>
          <strong className="text-white">1. Sync your CRM.</strong> POST your
          accounts (companies) and contacts (people) to{' '}
          <Link href="/docs/api/accounts" className="text-emerald-400 underline">
            /api/v1/accounts
          </Link>{' '}
          and{' '}
          <Link href="/docs/api/contacts" className="text-emerald-400 underline">
            /api/v1/contacts
          </Link>
          . Most customers run a daily cron.
        </li>
        <li>
          <strong className="text-white">2. Register a webhook.</strong> Tell us
          where to POST when one of your accounts gets funded:{' '}
          <Link href="/docs/api/webhooks" className="text-emerald-400 underline">
            /api/v1/webhooks
          </Link>
          .
        </li>
        <li>
          <strong className="text-white">3. Get warm intros.</strong> Within
          ~60 seconds of a funding round being ingested, we POST the match to
          your webhook. Pull{' '}
          <Link href="/docs/api/matches" className="text-emerald-400 underline">
            /api/v1/matches
          </Link>{' '}
          as a fallback.
        </li>
      </ol>

      <h2 className="mt-14 text-2xl font-bold">Quick links</h2>
      <ul className="mt-4 space-y-2 text-slate-300">
        <li>
          🚀{' '}
          <Link href="/docs/api/quickstart" className="text-emerald-400 underline">
            5-minute quickstart
          </Link>{' '}
          — complete integration in 4 curl calls
        </li>
        <li>
          🔑{' '}
          <Link href="/docs/api/authentication" className="text-emerald-400 underline">
            Authentication
          </Link>{' '}
          — how API keys work
        </li>
        <li>
          🧠{' '}
          <Link href="/docs/api/match-logic" className="text-emerald-400 underline">
            How matches work
          </Link>{' '}
          — the three match paths (domain / email / name)
        </li>
        <li>
          📨{' '}
          <Link href="/docs/api/webhooks" className="text-emerald-400 underline">
            Webhook payload format
          </Link>{' '}
          — exact JSON you&apos;ll receive
        </li>
      </ul>

      <div className="mt-14 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 p-6">
        <h3 className="text-lg font-bold">Ready to integrate?</h3>
        <p className="mt-2 text-slate-300">
          Generate an API key at{' '}
          <Link href="/settings" className="text-emerald-400 underline">
            Settings → API Keys
          </Link>{' '}
          (Pro subscription required), then jump to the{' '}
          <Link href="/docs/api/quickstart" className="text-emerald-400 underline">
            quickstart
          </Link>
          .
        </p>
      </div>
    </div>
  )
}

function Card({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5">
      <div className="text-2xl">{emoji}</div>
      <h3 className="mt-2 font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-slate-400">{children}</p>
    </div>
  )
}
