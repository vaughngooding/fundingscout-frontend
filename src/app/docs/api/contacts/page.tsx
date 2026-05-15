import Link from 'next/link'
import type { Metadata } from 'next'
import CodeBlock, { InlineCode } from '../_CodeBlock'

export const metadata: Metadata = {
  title: 'Contacts — FundingScout CRM Match API',
  description:
    'Upsert your CRM contacts (people) to FundingScout. Idempotent batch endpoint, up to 1,000 contacts per request.',
}

export default function Contacts() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
        Resource
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Contacts</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-400">
        Contacts represent people in your CRM (Salesforce &quot;Contacts&quot;, HubSpot
        &quot;Contacts&quot;, Apollo &quot;Leads&quot;, etc.). Link them to an{' '}
        <Link href="/docs/api/accounts" className="text-emerald-400 underline">
          account
        </Link>{' '}
        via <InlineCode>account_external_id</InlineCode> so we can surface
        every contact at a funded company — even when their personal email
        wouldn&apos;t match the domain directly.
      </p>

      <h2 className="mt-12 text-2xl font-bold">POST /api/v1/contacts</h2>
      <p className="mt-3 text-slate-300">
        Upsert key:{' '}
        <InlineCode>(your_user_id, external_id)</InlineCode>. Max 1,000 contacts per request.
      </p>

      <h3 className="mt-8 text-lg font-semibold">Request body</h3>
      <CodeBlock>
{`{
  "contacts": [
    {
      "external_id": "0034x000007xY3oAAE",   // required
      "email": "sarah@vellum.ai",             // optional (used for email_domain matching)
      "first_name": "Sarah",                  // optional
      "last_name": "Park",                    // optional
      "account_external_id": "0014x...",      // optional but recommended
      "metadata": { "title": "VP Sales" }     // optional, JSONB passthrough
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
            <tr><td className="py-3 pr-4"><InlineCode>external_id</InlineCode></td><td>string</td><td>yes</td><td className="py-3">Your CRM&apos;s ID for this contact. Upsert key.</td></tr>
            <tr><td className="py-3 pr-4"><InlineCode>email</InlineCode></td><td>string</td><td>no</td><td className="py-3">Powers the <Link href="/docs/api/match-logic" className="text-emerald-400 underline">email_domain match path</Link>. Free-mail domains (gmail, yahoo, etc.) are excluded from matching.</td></tr>
            <tr><td className="py-3 pr-4"><InlineCode>first_name</InlineCode></td><td>string</td><td>no</td><td className="py-3">Returned in match payloads — useful for personalizing outreach.</td></tr>
            <tr><td className="py-3 pr-4"><InlineCode>last_name</InlineCode></td><td>string</td><td>no</td><td className="py-3">Same as above.</td></tr>
            <tr><td className="py-3 pr-4"><InlineCode>account_external_id</InlineCode></td><td>string</td><td>no</td><td className="py-3">Links this contact to an account. Critical for personal-email contacts who&apos;d otherwise miss the match.</td></tr>
            <tr><td className="py-3 pr-4"><InlineCode>metadata</InlineCode></td><td>object</td><td>no</td><td className="py-3">Arbitrary JSON. Returned unchanged when this contact is in a match payload.</td></tr>
          </tbody>
        </table>
      </div>

      <h3 className="mt-8 text-lg font-semibold">Response (200)</h3>
      <CodeBlock>{`{ "upserted": 312, "errors": [] }`}</CodeBlock>

      <h2 className="mt-14 text-2xl font-bold">Why link contacts to accounts?</h2>
      <p className="mt-3 text-slate-300">
        Suppose Sarah works at Vellum AI but her CRM email is{' '}
        <InlineCode>sarah@gmail.com</InlineCode> (personal). Without linking,
        the email-domain match path can&apos;t connect her to Vellum&apos;s
        funding event. With <InlineCode>account_external_id</InlineCode>{' '}
        pointing to the Vellum account, she shows up in the match anyway —
        because the account domain matches.
      </p>
      <p className="mt-3 text-slate-300">
        Roughly 30–40% of B2B contacts in a typical CRM use personal email
        domains. Linking them to accounts roughly doubles your match coverage.
      </p>

      <h2 className="mt-14 text-2xl font-bold">DELETE /api/v1/contacts</h2>
      <CodeBlock>
{`curl -X DELETE "https://fundingscout.io/api/v1/contacts?external_id=003C1" \\
  -H "Authorization: Bearer $FS_KEY"

# Response: { "deleted": 1 }`}
      </CodeBlock>

      <h2 className="mt-14 text-2xl font-bold">Privacy notes</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
        <li>
          We store contact email + name solely to match against funding rounds. We never email your contacts or share them with third parties.
        </li>
        <li>
          DELETE removes the row immediately. There&apos;s no soft-delete or retention period for contacts.
        </li>
        <li>
          Free-mail domains (gmail, yahoo, hotmail, etc.) are excluded from the email-domain match path — to prevent spam matches.
        </li>
      </ul>
    </div>
  )
}
