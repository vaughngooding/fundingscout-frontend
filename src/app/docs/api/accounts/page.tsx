import Link from 'next/link'
import type { Metadata } from 'next'
import CodeBlock, { InlineCode } from '../_CodeBlock'

export const metadata: Metadata = {
  title: 'Accounts — FundingScout CRM Match API',
  description:
    'Upsert your CRM accounts (companies) to FundingScout. Idempotent batch endpoint, up to 1,000 accounts per request.',
}

export default function Accounts() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
        Resource
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Accounts</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-400">
        Accounts represent companies in your CRM (Salesforce &quot;Accounts&quot;,
        HubSpot &quot;Companies&quot;, etc.). Sync them so we can match funding events
        directly to entities in your pipeline.
      </p>

      <h2 className="mt-12 text-2xl font-bold">POST /api/v1/accounts</h2>
      <p className="mt-3 text-slate-300">
        Upserts up to 1,000 accounts in a single call. The upsert key is{' '}
        <InlineCode>(your_user_id, external_id)</InlineCode> — repeat calls
        with the same <InlineCode>external_id</InlineCode> update the row in
        place.
      </p>

      <h3 className="mt-8 text-lg font-semibold">Request body</h3>
      <CodeBlock>
{`{
  "accounts": [
    {
      "external_id": "0014x000007xY3oAAE",  // required: your CRM's account ID
      "name": "Vellum AI",                   // required
      "domain": "vellum.ai",                 // optional but strongly recommended
      "metadata": {                          // optional: stored as JSONB, returned in matches
        "industry": "AI",
        "owner_email": "rep@yourco.com",
        "stage": "qualified"
      }
    }
  ]
}`}
      </CodeBlock>

      <h3 className="mt-8 text-lg font-semibold">Field reference</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 text-left text-slate-400">
            <tr>
              <th className="py-2 pr-4">Field</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Required</th>
              <th className="py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            <tr>
              <td className="py-3 pr-4"><InlineCode>external_id</InlineCode></td>
              <td className="py-3 pr-4">string</td>
              <td className="py-3 pr-4">yes</td>
              <td className="py-3">Your CRM&apos;s ID for this account. Used as the upsert key.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4"><InlineCode>name</InlineCode></td>
              <td className="py-3 pr-4">string</td>
              <td className="py-3 pr-4">yes</td>
              <td className="py-3">Company name. Used for the <Link href="/docs/api/match-logic" className="text-emerald-400 underline">account_name match path</Link>.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4"><InlineCode>domain</InlineCode></td>
              <td className="py-3 pr-4">string</td>
              <td className="py-3 pr-4">no</td>
              <td className="py-3">e.g. <InlineCode>vellum.ai</InlineCode>. Highest-precision match key. We normalize (strip <InlineCode>https://</InlineCode>, <InlineCode>www.</InlineCode>, paths).</td>
            </tr>
            <tr>
              <td className="py-3 pr-4"><InlineCode>metadata</InlineCode></td>
              <td className="py-3 pr-4">object</td>
              <td className="py-3 pr-4">no</td>
              <td className="py-3">Arbitrary JSON. Returned unchanged when this account is in a match payload.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="mt-8 text-lg font-semibold">Response (200)</h3>
      <CodeBlock>
{`{
  "upserted": 247,
  "errors": [
    { "index": 12, "error": "external_id is required and must be a non-empty string" }
  ]
}`}
      </CodeBlock>
      <p className="mt-3 text-sm text-slate-400">
        Per-row errors don&apos;t fail the batch — valid rows are still upserted.
        Check the <InlineCode>errors</InlineCode> array for rows that didn&apos;t make it in.
      </p>

      <h3 className="mt-8 text-lg font-semibold">Limits</h3>
      <ul className="mt-3 list-disc space-y-1 pl-6 text-sm text-slate-300">
        <li>Max <strong className="text-white">1,000 accounts</strong> per request</li>
        <li>For larger CRMs, paginate client-side</li>
        <li>Daily quota tracked under <InlineCode>crm_accounts_upsert</InlineCode></li>
      </ul>

      <h2 className="mt-14 text-2xl font-bold">DELETE /api/v1/accounts</h2>
      <p className="mt-3 text-slate-300">
        Removes a single account by <InlineCode>external_id</InlineCode>. Cascade-deletes any{' '}
        <Link href="/docs/api/matches" className="text-emerald-400 underline">
          match_notifications
        </Link>{' '}
        tied to this account.
      </p>
      <CodeBlock>
{`curl -X DELETE "https://fundingscout.io/api/v1/accounts?external_id=001A1" \\
  -H "Authorization: Bearer $FS_KEY"

# Response:
# { "deleted": 1 }`}
      </CodeBlock>

      <h2 className="mt-14 text-2xl font-bold">Best practices</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
        <li>
          <strong className="text-white">Always send domain when you have it.</strong>{' '}
          Domain matching is the most precise of the three match paths. Without it, you fall back to fuzzy-name matching.
        </li>
        <li>
          <strong className="text-white">Don&apos;t send empty/test data.</strong>{' '}
          Each row counts against your account quota. Filter dummy records server-side.
        </li>
        <li>
          <strong className="text-white">Use stable external_ids.</strong>{' '}
          The <InlineCode>external_id</InlineCode> should be your CRM&apos;s primary key for the record (Salesforce ID, HubSpot vid, etc.) — not something that changes when the account is renamed or merged.
        </li>
        <li>
          <strong className="text-white">Run sync daily, not hourly.</strong>{' '}
          Funding rounds are emitted within ~60 seconds of press releases, so once a day is plenty. Hourly is fine if you want fresher data, but more than that is wasted compute.
        </li>
      </ul>
    </div>
  )
}
