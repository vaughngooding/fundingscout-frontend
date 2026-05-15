import Link from 'next/link'
import type { Metadata } from 'next'
import CodeBlock, { InlineCode } from '../_CodeBlock'

export const metadata: Metadata = {
  title: 'Authentication — FundingScout CRM Match API',
  description:
    'How API keys work, where to get one, and how to send requests with the right Authorization header.',
}

export default function Authentication() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
        Getting started
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Authentication</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-400">
        Every request to the FundingScout API uses a bearer token sent via the
        standard <InlineCode>Authorization</InlineCode> header.
      </p>

      <h2 className="mt-12 text-2xl font-bold">The header</h2>
      <CodeBlock>{`Authorization: Bearer fs_live_<your_key>`}</CodeBlock>
      <p className="mt-3 text-slate-300">
        That&apos;s the entire auth surface — no signing, no OAuth flows, no
        timestamps. Send the bearer token on every request.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Getting a key</h2>
      <ol className="mt-4 space-y-3 text-slate-300">
        <li>
          1. Have a{' '}
          <strong className="text-white">Pro subscription</strong>. Free and
          Basic users hit 403 on every endpoint. Upgrade at{' '}
          <Link href="/settings" className="text-emerald-400 underline">
            Settings
          </Link>
          .
        </li>
        <li>
          2. Go to{' '}
          <Link href="/settings" className="text-emerald-400 underline">
            Settings → API Keys
          </Link>{' '}
          and click <strong className="text-white">Create new key</strong>.
        </li>
        <li>
          3. Name the key (e.g.{' '}
          <InlineCode>hubspot-prod-sync</InlineCode>) and copy the full token
          shown in the modal — <strong className="text-white">we only show it once</strong>.
        </li>
        <li>
          4. Store it in your secrets manager (1Password, AWS Secrets Manager,
          your platform&apos;s env-var system). Treat it like a password.
        </li>
      </ol>

      <h2 className="mt-12 text-2xl font-bold">Key format</h2>
      <p className="mt-3 text-slate-300">
        Keys always start with <InlineCode>fs_live_</InlineCode> followed by
        32 base-62 characters. The first 12 characters (e.g.{' '}
        <InlineCode>fs_live_a1b2</InlineCode>) are stored as a prefix for UI
        display and quick lookup; the full key is stored only as a SHA-256
        hash. Even FundingScout staff can&apos;t recover the plaintext.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Revoking a key</h2>
      <p className="mt-3 text-slate-300">
        At{' '}
        <Link href="/settings" className="text-emerald-400 underline">
          Settings → API Keys
        </Link>{' '}
        click <strong className="text-white">Revoke</strong> next to any key.
        Revocation is immediate — the next request with that key returns 401.
        Revoked keys are kept in the database (never deleted) so audit logs
        remain valid.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Multiple keys per user</h2>
      <p className="mt-3 text-slate-300">
        One Pro account can have many keys (e.g., one per integration:
        Salesforce sync, HubSpot sync, internal data warehouse, dev/staging).
        All keys share the same underlying CRM data — rotating a key
        doesn&apos;t lose your synced accounts/contacts. The synced data is
        scoped to your account, not to a specific key.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Same key for every API surface</h2>
      <p className="mt-3 text-slate-300">
        The CRM Match API, the{' '}
        <Link href="/docs/mcp" className="text-emerald-400 underline">
          MCP integration
        </Link>{' '}
        (for Claude Code and other MCP-compatible clients), and any future
        FundingScout API surface all use the same{' '}
        <InlineCode>fs_live_</InlineCode> keys. One credential, every product.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Common mistakes</h2>
      <div className="mt-4 space-y-3">
        <Pitfall title="Missing Bearer prefix">
          The header must be <InlineCode>Authorization: Bearer fs_live_...</InlineCode>{' '}
          (with the literal word &quot;Bearer&quot; before the key). Sending just{' '}
          <InlineCode>Authorization: fs_live_...</InlineCode> returns 401.
        </Pitfall>
        <Pitfall title="Using a revoked key">
          Returns 401 <InlineCode>invalid_or_revoked_key</InlineCode>. Generate a new key.
        </Pitfall>
        <Pitfall title="Hitting the API with a Free/Basic account">
          Returns 403 <InlineCode>pro_required</InlineCode>. Upgrade to Pro.
        </Pitfall>
        <Pitfall title="Forgetting to URL-encode special characters">
          Most API keys are alphanumeric, but if you ever see a `+`, `/`, or `=` in a key (unlikely), URL-encode it when passing in query strings.
        </Pitfall>
      </div>

      <div className="mt-12 rounded-xl border border-slate-800 bg-slate-950/50 p-5">
        <h3 className="font-semibold text-white">Next:{' '}
          <Link href="/docs/api/quickstart" className="text-emerald-400 underline">
            Quickstart
          </Link>
        </h3>
        <p className="mt-2 text-sm text-slate-400">
          With your key in hand, follow the 5-minute quickstart to send your
          first request.
        </p>
      </div>
    </div>
  )
}

function Pitfall({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
      <p className="font-semibold text-amber-300">{title}</p>
      <p className="mt-1 text-sm text-slate-300">{children}</p>
    </div>
  )
}
