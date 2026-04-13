import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import QualityClient from './QualityClient'

const ADMIN_USER_IDS = new Set<string>([
  '17ffe015-825d-4326-b52f-d3c795ac3d43',
])

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FIELDS = ['company_name', 'amount_usd', 'funding_type', 'location', 'ceo_name', 'website', 'investors', 'lead_investor']

export default async function QualityDashboard() {
  // Auth check
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || !ADMIN_USER_IDS.has(user.id)) notFound()

  // Service role client for admin queries
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Fetch data in parallel
  const [agentRunsRes, auditsRes, userFlagsRes] = await Promise.all([
    // Fetch ALL runs for uptime calculation (no time cap).
    // For the table view we only show recent rows, but uptime %
    // should reflect the entire lifetime of the system.
    // We select only the columns needed to keep payload small.
    supabase
      .from('agent_runs')
      .select('id,agent,run_at,duration_ms,domain,items,errors,learnings')
      .order('run_at', { ascending: false })
      .limit(50000),
    supabase
      .from('alert_audits')
      .select('*, funding_round:funding_rounds(company_name, source_feed, amount_usd, funding_type)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('user_alerts')
      .select('id, user_flag, user_flag_at, funding_round:funding_rounds(company_name)')
      .not('user_flag', 'is', null)
      .order('user_flag_at', { ascending: false })
      .limit(20),
  ])

  const agentRuns = agentRunsRes.data || []
  const audits = auditsRes.data || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userFlags = (userFlagsRes.data || []) as any[]

  // Compute summary stats
  const totalAudited = audits.length
  const fundingCount = audits.filter(a => a.classification === 'FUNDING').length
  const notFundingCount = audits.filter(a => a.classification === 'NOT_FUNDING').length
  const scores = audits.map(a => a.accuracy_score).filter((s): s is number => s !== null)
  const avgAccuracy = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const fpRate = totalAudited ? notFundingCount / totalAudited : 0

  // Field accuracy aggregation
  const fieldStats: Record<string, { correct: number; incorrect: number; unverifiable: number; not_extracted: number }> = {}
  for (const f of FIELDS) fieldStats[f] = { correct: 0, incorrect: 0, unverifiable: 0, not_extracted: 0 }

  for (const a of audits) {
    const verdicts = typeof a.field_verdicts === 'string' ? JSON.parse(a.field_verdicts) : a.field_verdicts
    if (!verdicts) continue
    for (const [field, verdict] of Object.entries(verdicts)) {
      if (!fieldStats[field]) continue
      const v = verdict as string
      if (v === 'CORRECT') fieldStats[field].correct++
      else if (v === 'INCORRECT') fieldStats[field].incorrect++
      else if (v === 'UNVERIFIABLE') fieldStats[field].unverifiable++
      else fieldStats[field].not_extracted++
    }
  }

  // Source accuracy aggregation
  const sourceStats: Record<string, { total: number; funding: number; not_funding: number }> = {}
  for (const a of audits) {
    const source = a.funding_round?.source_feed || 'unknown'
    if (!sourceStats[source]) sourceStats[source] = { total: 0, funding: 0, not_funding: 0 }
    sourceStats[source].total++
    if (a.classification === 'FUNDING') sourceStats[source].funding++
    if (a.classification === 'NOT_FUNDING') sourceStats[source].not_funding++
  }
  const sortedSources = Object.entries(sourceStats).sort((a, b) =>
    (b[1].not_funding / b[1].total) - (a[1].not_funding / a[1].total)
  )

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Quality Dashboard</h1>
          <p className="text-sm text-slate-400 mt-1">
            Agent heartbeat, extraction accuracy, and self-improvement loop
          </p>
        </div>
        <Link
          href="/admin/users"
          className="text-sm text-slate-400 hover:text-white px-3 py-2 rounded-lg hover:bg-slate-800/50 transition-colors"
        >
          Users Admin
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total Audited" value={totalAudited.toString()} />
        <SummaryCard
          label="Accuracy"
          value={`${(avgAccuracy * 100).toFixed(0)}%`}
          color={avgAccuracy >= 0.8 ? 'emerald' : avgAccuracy >= 0.6 ? 'amber' : 'red'}
        />
        <SummaryCard
          label="False Positive Rate"
          value={`${(fpRate * 100).toFixed(0)}%`}
          color={fpRate <= 0.1 ? 'emerald' : fpRate <= 0.25 ? 'amber' : 'red'}
        />
        <SummaryCard label="FUNDING" value={fundingCount.toString()} color="emerald" />
        <SummaryCard label="NOT_FUNDING" value={notFundingCount.toString()} color="red" />
      </div>

      {/* Interactive sections: Audit Results (expandable) + Agent Runs (collapsible with uptime) + User Flags */}
      <QualityClient
        agentRuns={agentRuns}
        audits={audits}
        userFlags={userFlags}
      />

      {/* Two-column: Source Accuracy + Field Accuracy (static, server-rendered) */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Source Accuracy */}
        <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="text-base font-semibold text-white">Accuracy by Source</h2>
            <p className="text-xs text-slate-400">Which RSS feeds produce false positives?</p>
          </div>
          <div className="p-4 space-y-3">
            {sortedSources.map(([source, stats]) => {
              const fpPct = stats.total ? (stats.not_funding / stats.total) * 100 : 0
              const goodPct = stats.total ? (stats.funding / stats.total) * 100 : 0
              return (
                <div key={source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300 truncate max-w-[200px]">{source}</span>
                    <span className="text-xs text-slate-500">{stats.total} audited</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                    <div className="bg-emerald-500 transition-all" style={{ width: `${goodPct}%` }} />
                    <div className="bg-red-500 transition-all" style={{ width: `${fpPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-emerald-400">{stats.funding} funding</span>
                    {stats.not_funding > 0 && (
                      <span className="text-[10px] text-red-400">{stats.not_funding} false pos</span>
                    )}
                  </div>
                </div>
              )
            })}
            {sortedSources.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No source data yet</p>
            )}
          </div>
        </section>

        {/* Field Accuracy */}
        <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="text-base font-semibold text-white">Accuracy by Field</h2>
            <p className="text-xs text-slate-400">Which extracted fields are most often wrong?</p>
          </div>
          <div className="p-4 space-y-3">
            {FIELDS.map((field) => {
              const s = fieldStats[field]
              const verifiable = s.correct + s.incorrect
              const acc = verifiable > 0 ? (s.correct / verifiable) * 100 : 0
              return (
                <div key={field}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300 font-mono">{field}</span>
                    <span className={`text-xs font-medium ${
                      acc >= 90 ? 'text-emerald-400' : acc >= 70 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {verifiable > 0 ? `${acc.toFixed(0)}%` : '—'}
                    </span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-800">
                    {verifiable > 0 && (
                      <>
                        <div className="bg-emerald-500" style={{ width: `${acc}%` }} />
                        <div className="bg-red-500" style={{ width: `${100 - acc}%` }} />
                      </>
                    )}
                  </div>
                  <div className="flex gap-3 mt-0.5">
                    <span className="text-[10px] text-emerald-400">{s.correct} correct</span>
                    {s.incorrect > 0 && <span className="text-[10px] text-red-400">{s.incorrect} wrong</span>}
                    {s.unverifiable > 0 && <span className="text-[10px] text-slate-500">{s.unverifiable} unverifiable</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: string; color?: string }) {
  const colorClass = color === 'emerald' ? 'text-emerald-400' :
                     color === 'red' ? 'text-red-400' :
                     color === 'amber' ? 'text-amber-400' :
                     'text-white'
  return (
    <div className="bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3">
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${colorClass}`}>{value}</div>
    </div>
  )
}
