import Link from 'next/link'
import type { Metadata } from 'next'
import CodeBlock, { InlineCode } from '../_CodeBlock'

export const metadata: Metadata = {
  title: 'Matches — FundingScout CRM Match API',
  description:
    'Pull paginated match notifications. Use this if you can\'t host a webhook, or as a recovery mechanism after webhook failures.',
}

export default function Matches() {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
        Resource
      </p>
      <h1 className="mt-3 text-4xl font-extrabold tracking-tight">Matches</h1>
      <p className="mt-5 text-lg leading-relaxed text-slate-400">
        Pull paginated match notifications. Use this if you can&apos;t host a{' '}
        <Link href="/docs/api/webhooks" className="text-emerald-400 underline">
          webhook
        </Link>{' '}
        — or as a recovery mechanism if your webhook missed some deliveries.
      </p>

      <h2 className="mt-12 text-2xl font-bold">GET /api/v1/matches</h2>
      <CodeBlock>
{`curl https://fundingscout.io/api/v1/matches?limit=100 \\
  -H "Authorization: Bearer $FS_KEY"`}
      </CodeBlock>

      <h3 className="mt-8 text-lg font-semibold">Query parameters</h3>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-700 text-left text-slate-400">
            <tr>
              <th className="py-2 pr-4">Param</th>
              <th className="py-2 pr-4">Type</th>
              <th className="py-2 pr-4">Default</th>
              <th className="py-2">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-slate-300">
            <tr>
              <td className="py-3 pr-4"><InlineCode>since</InlineCode></td>
              <td>ISO 8601</td>
              <td>—</td>
              <td className="py-3">Return matches with <InlineCode>created_at &lt; since</InlineCode>. Pass <InlineCode>next_cursor</InlineCode> from previous response.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4"><InlineCode>limit</InlineCode></td>
              <td>integer</td>
              <td>50</td>
              <td className="py-3">Max 200 per page.</td>
            </tr>
            <tr>
              <td className="py-3 pr-4"><InlineCode>status</InlineCode></td>
              <td>csv</td>
              <td>all</td>
              <td className="py-3">Filter by <InlineCode>webhook_status</InlineCode>. Values: <InlineCode>delivered</InlineCode>, <InlineCode>failed</InlineCode>, <InlineCode>no_webhook</InlineCode>, <InlineCode>pending</InlineCode>. Combine with comma: <InlineCode>?status=failed,no_webhook</InlineCode>.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3 className="mt-8 text-lg font-semibold">Response (200)</h3>
      <CodeBlock>
{`{
  "data": [
    {
      "match_id": "f1b2c3d4-...",
      "match_type": "account_domain",
      "matched": {
        "account_external_id": "0014x000007xY3oAAE",
        "contact_external_id": null
      },
      "webhook_status": "delivered",
      "webhook_response_code": 200,
      "delivered_at": "2026-05-12T01:54:01Z",
      "created_at": "2026-05-12T01:54:00Z",
      "funding_round": {
        "id": "9e34cb64-...",
        "company_name": "Vellum AI",
        "amount_usd": 20000000,
        "funding_type": "series-a",
        "website": "https://vellum.ai",
        "article_url": "https://www.businesswire.com/...",
        "published_date": "2026-05-12",
        "ceo_name": "Akash Sharma",
        "ceo_email": "akash@vellum.ai",
        "industry": "AI Infrastructure",
        "investors": ["Spark Capital", "..."],
        "confidence_score": 0.95
      }
    }
    // ... more matches
  ],
  "next_cursor": "2026-05-11T17:33:14Z"   // pass as ?since= on next call; null when no more pages
}`}
      </CodeBlock>

      <h2 className="mt-14 text-2xl font-bold">Common patterns</h2>

      <h3 className="mt-8 text-lg font-semibold">Polling-only customer (no webhook)</h3>
      <p className="mt-3 text-slate-300">
        Run this every 15 minutes via cron:
      </p>
      <CodeBlock>
{`# 1. Read last cursor from your DB
LAST_CURSOR=$(cat last_cursor.txt 2>/dev/null || echo "")

# 2. Fetch new matches
URL="https://fundingscout.io/api/v1/matches?limit=200"
[ -n "$LAST_CURSOR" ] && URL="$URL&since=$LAST_CURSOR"

RESPONSE=$(curl -sS "$URL" -H "Authorization: Bearer $FS_KEY")

# 3. Process matches + save new cursor
echo "$RESPONSE" | jq '.data[]' | your_processor.py
echo "$RESPONSE" | jq -r '.next_cursor' > last_cursor.txt`}
      </CodeBlock>

      <h3 className="mt-8 text-lg font-semibold">Webhook recovery (find failed deliveries)</h3>
      <p className="mt-3 text-slate-300">
        Find matches that failed delivery so you can reprocess them:
      </p>
      <CodeBlock>
{`curl "https://fundingscout.io/api/v1/matches?status=failed&limit=200" \\
  -H "Authorization: Bearer $FS_KEY"`}
      </CodeBlock>

      <h3 className="mt-8 text-lg font-semibold">Inspect a single match</h3>
      <p className="mt-3 text-slate-300">
        After receiving a webhook, you can pull the same match back from the API by filtering on dates:
      </p>
      <CodeBlock>
{`# Pull matches from the last hour
HOUR_AGO=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ)
curl "https://fundingscout.io/api/v1/matches?since=$HOUR_AGO" \\
  -H "Authorization: Bearer $FS_KEY"`}
      </CodeBlock>

      <h2 className="mt-14 text-2xl font-bold">Ordering and consistency</h2>
      <ul className="mt-3 list-disc space-y-2 pl-6 text-slate-300">
        <li>
          Results are ordered by <InlineCode>created_at DESC</InlineCode> (newest first).
        </li>
        <li>
          A match appears in this endpoint <strong className="text-white">at the same time</strong> the webhook fires — no extra delay. Both surfaces draw from the same row.
        </li>
        <li>
          The cursor (<InlineCode>next_cursor</InlineCode>) is the <InlineCode>created_at</InlineCode> of the last item on the page. There&apos;s no separate opaque cursor format.
        </li>
        <li>
          If the API returns fewer than <InlineCode>limit</InlineCode> rows, <InlineCode>next_cursor</InlineCode> is <InlineCode>null</InlineCode> — you&apos;ve reached the end.
        </li>
      </ul>
    </div>
  )
}
