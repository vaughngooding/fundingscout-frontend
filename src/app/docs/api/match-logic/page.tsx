import Link from 'next/link'
import type { Metadata } from 'next'
import { InlineCode } from '../_CodeBlock'

export const metadata: Metadata = {
  title: 'How matches work — FundingScout CRM Match API',
  description:
    'The three match paths FundingScout uses to connect a funding round to your CRM accounts and contacts: domain, email-domain, and name.',
}

export default function MatchLogic() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
        Reference
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">How matches work</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-400">
        For every funding round we ingest, we try three match paths in
        precedence order. The first hit wins — you get at most one webhook
        per <InlineCode>(your_user_id, funding_round_id)</InlineCode> pair,
        even when multiple paths fire.
      </p>

      <h2 className="mt-12 text-2xl font-bold">The three paths</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 text-left text-slate-400">
            <tr>
              <th className="py-2 pr-4">Path</th>
              <th className="py-2 pr-4">Precedence</th>
              <th className="py-2 pr-4">Match key</th>
              <th className="py-2">When it fires</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            <tr>
              <td className="py-3 pr-4"><InlineCode>account_domain</InlineCode></td>
              <td className="py-3 pr-4">1 (highest)</td>
              <td className="py-3 pr-4">crm_accounts.domain ↔ funding website</td>
              <td className="py-3">Your account&apos;s <InlineCode>vellum.ai</InlineCode> matches Vellum&apos;s funding round.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4"><InlineCode>email_domain</InlineCode></td>
              <td className="py-3 pr-4">2</td>
              <td className="py-3 pr-4">crm_contacts.email ↔ funding website</td>
              <td className="py-3">Contact&apos;s work email matches the funded company&apos;s domain. Free-mail domains (gmail, yahoo, etc.) are excluded.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4"><InlineCode>account_name</InlineCode></td>
              <td className="py-3 pr-4">3</td>
              <td className="py-3 pr-4">crm_accounts.name ↔ funding company name</td>
              <td className="py-3">Fallback for accounts where you don&apos;t have a domain populated. Normalized exact match.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl font-bold">Normalization rules</h2>
      <p className="mt-3 text-slate-300">
        Before comparing, both sides go through normalization:
      </p>

      <h3 className="mt-6 text-lg font-semibold">Domain normalization</h3>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-300">
        <li>Strip <InlineCode>https://</InlineCode> / <InlineCode>http://</InlineCode> prefix</li>
        <li>Strip path (<InlineCode>/about</InlineCode>), query (<InlineCode>?utm=x</InlineCode>), fragment (<InlineCode>#section</InlineCode>)</li>
        <li>Strip leading <InlineCode>www.</InlineCode></li>
        <li>Lowercase everything</li>
        <li>e.g. <InlineCode>https://www.Vellum.AI/about</InlineCode> → <InlineCode>vellum.ai</InlineCode></li>
      </ul>

      <h3 className="mt-6 text-lg font-semibold">Email domain extraction</h3>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-300">
        <li>Take everything after <InlineCode>@</InlineCode></li>
        <li>Apply the domain normalization rules above</li>
        <li>e.g. <InlineCode>Sarah@Vellum.AI</InlineCode> → <InlineCode>vellum.ai</InlineCode></li>
      </ul>

      <h3 className="mt-6 text-lg font-semibold">Name normalization (for account_name path)</h3>
      <ul className="mt-2 list-disc space-y-1 pl-6 text-slate-300">
        <li>Strip common legal suffixes: <InlineCode>Inc</InlineCode>, <InlineCode>LLC</InlineCode>, <InlineCode>Corp</InlineCode>, <InlineCode>Ltd</InlineCode>, <InlineCode>Co</InlineCode>, <InlineCode>Holdings</InlineCode>, <InlineCode>Group</InlineCode>, <InlineCode>LP</InlineCode>, etc.</li>
        <li>Lowercase</li>
        <li>Remove non-alphanumeric characters (except spaces)</li>
        <li>Collapse whitespace</li>
        <li>e.g. <InlineCode>&quot;Vellum AI, Inc.&quot;</InlineCode> → <InlineCode>&quot;vellum ai&quot;</InlineCode></li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold">Free-mail domain exclusions</h2>
      <p className="mt-3 text-slate-300">
        The <InlineCode>email_domain</InlineCode> match path skips these domains entirely — otherwise every funding round at &quot;gmail.com&quot; would notify every Gmail user in every CRM:
      </p>
      <p className="mt-3 text-sm text-slate-400">
        gmail.com, googlemail.com, yahoo.com, hotmail.com, outlook.com, live.com, aol.com, icloud.com, me.com, mac.com, protonmail.com, proton.me, pm.me, mail.com, gmx.com, zoho.com, fastmail.com
      </p>
      <p className="mt-3 text-slate-300">
        Contacts with personal email still match via their{' '}
        <InlineCode>account_external_id</InlineCode> linkage — see the{' '}
        <Link href="/docs/api/contacts" className="text-emerald-400 underline">
          Contacts page
        </Link>
        .
      </p>

      <h2 className="mt-12 text-2xl font-bold">Worked examples</h2>

      <h3 className="mt-6 text-lg font-semibold">Example 1: Domain match (cleanest case)</h3>
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-sm">
        <p className="text-slate-400">CRM account:</p>
        <pre className="mt-1 text-slate-200">{`{ "external_id": "0014x", "name": "Vellum AI", "domain": "vellum.ai" }`}</pre>
        <p className="mt-3 text-slate-400">Funding round arrives:</p>
        <pre className="mt-1 text-slate-200">{`{ "company_name": "Vellum AI", "website": "https://vellum.ai" }`}</pre>
        <p className="mt-3 text-emerald-300">
          → Match path: <InlineCode>account_domain</InlineCode>. Webhook fires with{' '}
          <InlineCode>matched.account_external_id = &quot;0014x&quot;</InlineCode>.
        </p>
      </div>

      <h3 className="mt-6 text-lg font-semibold">Example 2: Contact email match</h3>
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-sm">
        <p className="text-slate-400">CRM contact:</p>
        <pre className="mt-1 text-slate-200">{`{ "external_id": "003C", "email": "sarah@vellum.ai", "account_external_id": null }`}</pre>
        <p className="mt-3 text-slate-400">Funding round arrives:</p>
        <pre className="mt-1 text-slate-200">{`{ "company_name": "Vellum AI", "website": "https://vellum.ai" }`}</pre>
        <p className="mt-3 text-emerald-300">
          → Match path: <InlineCode>email_domain</InlineCode>. Webhook fires with{' '}
          <InlineCode>matched.contact_external_id = &quot;003C&quot;</InlineCode>.
        </p>
      </div>

      <h3 className="mt-6 text-lg font-semibold">Example 3: Personal-email contact on a named account</h3>
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-sm">
        <p className="text-slate-400">CRM account:</p>
        <pre className="mt-1 text-slate-200">{`{ "external_id": "0014x", "name": "Vellum AI", "domain": "vellum.ai" }`}</pre>
        <p className="mt-3 text-slate-400">CRM contact (personal email):</p>
        <pre className="mt-1 text-slate-200">{`{ "external_id": "003D", "email": "jane@gmail.com", "account_external_id": "0014x" }`}</pre>
        <p className="mt-3 text-slate-400">Funding round arrives:</p>
        <pre className="mt-1 text-slate-200">{`{ "company_name": "Vellum AI", "website": "https://vellum.ai" }`}</pre>
        <p className="mt-3 text-emerald-300">
          → Match path: <InlineCode>account_domain</InlineCode> (wins by precedence). Webhook fires with{' '}
          <InlineCode>matched.account_external_id = &quot;0014x&quot;</InlineCode>. Jane is captured because her{' '}
          <InlineCode>account_external_id</InlineCode> ties her to Vellum — your downstream system looks up all contacts on this account.
        </p>
      </div>

      <h3 className="mt-6 text-lg font-semibold">Example 4: Domain missing, name match saves the day</h3>
      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-sm">
        <p className="text-slate-400">CRM account (no domain populated):</p>
        <pre className="mt-1 text-slate-200">{`{ "external_id": "0014x", "name": "Vellum AI, Inc." }`}</pre>
        <p className="mt-3 text-slate-400">Funding round arrives:</p>
        <pre className="mt-1 text-slate-200">{`{ "company_name": "Vellum AI", "website": "https://vellum.ai" }`}</pre>
        <p className="mt-3 text-emerald-300">
          → Match path: <InlineCode>account_name</InlineCode>. Normalized account name (<InlineCode>&quot;vellum ai&quot;</InlineCode>) matches the normalized round name.
        </p>
      </div>

      <h2 className="mt-12 text-2xl font-bold">What we do NOT match on</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
        <li><strong className="text-white">First/last name.</strong> Common names cause too many false positives.</li>
        <li><strong className="text-white">Phone numbers.</strong> Rarely tied to a company identity for B2B.</li>
        <li><strong className="text-white">Industry.</strong> Way too coarse — we&apos;d match every &quot;AI&quot; company to every &quot;AI&quot; contact.</li>
        <li><strong className="text-white">Subdomains.</strong> <InlineCode>support.vellum.ai</InlineCode> normalizes to <InlineCode>vellum.ai</InlineCode> for matching, but if the funding round&apos;s website is at <InlineCode>vellum-ai-research.com</InlineCode>, that&apos;s a different domain.</li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold">Performance notes</h2>
      <p className="mt-3 text-slate-300">
        Each path is a single indexed Postgres query. Match latency is dominated by the
        webhook-firing step (single HTTP POST per match, 5-second timeout) — typically 100-500ms total per match. We process the last 24 hours of funding rounds on every dispatch tick (every minute), with{' '}
        <InlineCode>unique(user_id, funding_round_id)</InlineCode> dedup at the row level.
      </p>
    </div>
  )
}
