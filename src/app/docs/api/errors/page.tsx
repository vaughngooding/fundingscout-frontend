import type { Metadata } from 'next'
import { InlineCode } from '../_CodeBlock'

export const metadata: Metadata = {
  title: 'Errors — FundingScout CRM Match API',
  description:
    'HTTP status codes and error response shapes for the FundingScout CRM Match API.',
}

export default function Errors() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
        Reference
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Errors</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-400">
        All API errors return a JSON body with a standard shape so you can
        match on a machine-readable code instead of parsing strings.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Error response shape</h2>
      <div className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-5 text-sm text-slate-200">
        <pre>{`{
  "error": {
    "code": "invalid_or_revoked_key",
    "message": "This API key is not recognized or has been revoked."
  }
}`}</pre>
      </div>

      <h2 className="mt-12 text-2xl font-bold">HTTP status codes</h2>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 text-left text-slate-400">
            <tr>
              <th className="py-2 pr-4">HTTP</th>
              <th className="py-2 pr-4">code</th>
              <th className="py-2">Meaning</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            <tr>
              <td className="py-3 pr-4">400</td>
              <td className="py-3 pr-4"><InlineCode>invalid_json</InlineCode></td>
              <td className="py-3">Request body wasn&apos;t valid JSON.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">400</td>
              <td className="py-3 pr-4"><InlineCode>invalid_body</InlineCode></td>
              <td className="py-3">Body parsed but the top-level shape is wrong (e.g., missing <InlineCode>accounts</InlineCode> array).</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">400</td>
              <td className="py-3 pr-4"><InlineCode>batch_too_large</InlineCode></td>
              <td className="py-3">More than 1,000 accounts/contacts in one request.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">400</td>
              <td className="py-3 pr-4"><InlineCode>invalid_url</InlineCode></td>
              <td className="py-3">Webhook URL is not HTTPS, points to localhost, or otherwise rejected.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">400</td>
              <td className="py-3 pr-4"><InlineCode>missing_param</InlineCode></td>
              <td className="py-3">Required query param missing (e.g., <InlineCode>external_id</InlineCode> on DELETE).</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">401</td>
              <td className="py-3 pr-4"><InlineCode>missing_authorization</InlineCode></td>
              <td className="py-3">No <InlineCode>Authorization</InlineCode> header was sent.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">401</td>
              <td className="py-3 pr-4"><InlineCode>invalid_key_format</InlineCode></td>
              <td className="py-3">Token doesn&apos;t start with <InlineCode>fs_live_</InlineCode>.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">401</td>
              <td className="py-3 pr-4"><InlineCode>invalid_or_revoked_key</InlineCode></td>
              <td className="py-3">Key isn&apos;t in our DB, or was revoked at Settings → API Keys.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">403</td>
              <td className="py-3 pr-4"><InlineCode>pro_required</InlineCode></td>
              <td className="py-3">Account is not on Pro. API access requires Pro tier — upgrade in Settings.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">429</td>
              <td className="py-3 pr-4"><InlineCode>quota_exceeded</InlineCode></td>
              <td className="py-3">Per-tool daily quota hit. Retry after UTC midnight or contact us to raise limits.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">500</td>
              <td className="py-3 pr-4"><InlineCode>db_error</InlineCode></td>
              <td className="py-3">Our problem — we&apos;ll see it in logs. Safe to retry.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4">500</td>
              <td className="py-3 pr-4"><InlineCode>auth_lookup_failed</InlineCode> / <InlineCode>profile_lookup_failed</InlineCode></td>
              <td className="py-3">Transient DB issue during auth. Safe to retry.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 className="mt-12 text-2xl font-bold">Partial success: row-level errors</h2>
      <p className="mt-3 text-slate-300">
        Batch endpoints (<InlineCode>POST /accounts</InlineCode>,{' '}
        <InlineCode>POST /contacts</InlineCode>) accept up to 1,000 rows. If
        some rows have validation issues, the valid rows are still upserted
        and the invalid rows come back in the response body:
      </p>
      <div className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-5 text-sm text-slate-200">
        <pre>{`{
  "upserted": 998,
  "errors": [
    { "index": 14, "error": "external_id is required and must be a non-empty string" },
    { "index": 287, "error": "metadata must be a JSON object" }
  ]
}`}</pre>
      </div>
      <p className="mt-3 text-sm text-slate-400">
        HTTP status is still 200 in this case. Always check the{' '}
        <InlineCode>errors</InlineCode> array length, not just the status.
        Status 400 is only returned if{' '}
        <strong className="text-white">every</strong> row failed validation.
      </p>

      <h2 className="mt-12 text-2xl font-bold">Retry guidance</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
        <li>
          <strong className="text-white">4xx errors</strong>: don&apos;t retry. They&apos;re bugs in your request — fix the request and resend.
        </li>
        <li>
          <strong className="text-white">429 quota_exceeded</strong>: back off until UTC midnight, or email <a href="mailto:api@fundingscout.io" className="text-emerald-400 underline">api@fundingscout.io</a> to discuss higher limits.
        </li>
        <li>
          <strong className="text-white">5xx errors</strong>: retry with exponential backoff (1s, 3s, 9s, 27s). Most transient. If you see persistent 5xx, ping us.
        </li>
      </ul>

      <h2 className="mt-12 text-2xl font-bold">Webhook delivery failures (not API errors)</h2>
      <p className="mt-3 text-slate-300">
        Separate from API errors: when FundingScout POSTs to your webhook and
        your endpoint returns non-2xx (or times out after 5s), we mark the
        match as <InlineCode>webhook_status = &quot;failed&quot;</InlineCode>. These show up in:
      </p>
      <div className="my-4 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/90 p-5 text-sm text-slate-200">
        <pre>{`curl "https://fundingscout.io/api/v1/matches?status=failed" \\
  -H "Authorization: Bearer $FS_KEY"`}</pre>
      </div>
      <p className="mt-3 text-sm text-slate-400">
        The response includes <InlineCode>webhook_response_code</InlineCode> and a short snippet of the response body to help you debug your webhook.
      </p>
    </div>
  )
}
