'use client'

import { useState, useMemo } from 'react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentRun {
  id: string
  agent: string
  run_at: string
  duration_ms: number | null
  domain: string | null
  items: number
  errors: number
  learnings: string | null
  summary: Record<string, unknown> | null
}

interface AuditRow {
  id: string
  classification: 'FUNDING' | 'NOT_FUNDING' | 'UNCERTAIN' | null
  classification_reasoning: string | null
  field_verdicts: Record<string, string> | string | null
  field_notes: Record<string, string> | string | null
  potential_duplicates: unknown[] | null
  latency_seconds: number | null
  accuracy_score: number | null
  created_at: string
  funding_round?: {
    company_name: string
    source_feed: string | null
    amount_usd: number
    funding_type: string
  }
}

interface UserFlag {
  id: string
  user_flag: string
  user_flag_at: string | null
  funding_round: { company_name: string } | null
}

interface UserRow {
  id: string
  email: string
  full_name: string | null
  company: string | null
  plan: 'free' | 'pro'
  stripe_customer_id: string | null
  created_at: string
  linkedin_url: string | null
  min_amount: number | null
  max_amount: number | null
  funding_types: string[] | null
  countries: string[] | null
  industries: string[] | null
  slack_webhook_url: string | null
  slack_channel_email: string | null
  teams_webhook_url: string | null
  teams_channel_email: string | null
  telegram_chat_id: number | null
  phone_number: string | null
  phone_verified: boolean | null
  push_subscription: unknown | null
  imessage_enabled: boolean | null
  alert_count: number
}

interface QualityStats {
  totalAudited: number
  fundingCount: number
  notFundingCount: number
  avgAccuracy: number
  fpRate: number
  fieldStats: Record<string, { correct: number; incorrect: number; unverifiable: number; not_extracted: number }>
  sortedSources: [string, { total: number; funding: number; not_funding: number }][]
}

interface UserStats {
  totalUsers: number
  totalPro: number
  totalFree: number
  totalPaying: number
  mrr: number
}

interface EngagementRow {
  id: string
  email: string
  full_name: string | null
  plan: 'free' | 'pro'
  created_at: string
  last_sign_in_at: string | null
  alerts_read: number
  engaged_with_alert: boolean
  bookmarks: number
  channels_configured: number
  sessions_7d: number
  sessions_all_time: number
  time_on_site_7d_min: number
}

interface EngagementStats {
  total: number
  active7d: number
  active30d: number
  neverLoggedIn: number
  zombie: number
  activated: number
}

interface Funnel {
  signedUp: number
  loggedIn: number
  loggedIn3Plus: number
  readAlert: number
  bookmarked: number
  configuredChannel: number
}

interface AnonymousDay {
  date: string
  visitors: number
}

interface Props {
  agentRuns: AgentRun[]
  audits: AuditRow[]
  userFlags: UserFlag[]
  qualityStats: QualityStats
  userRows: UserRow[]
  userStats: UserStats
  engagementRows: EngagementRow[]
  engagementStats: EngagementStats
  funnel: Funnel
  topPages: [string, number][]
  anonymousDaily: AnonymousDay[]
  eventsTableMissing: boolean
}

type Tab = 'users' | 'engagement' | 'quality' | 'usage'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const AGENT_COLORS: Record<string, string> = {
  scraper: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  watchdog: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  webhooks: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  digest: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  twitter: 'bg-sky-500/20 text-sky-400 border-sky-500/30',
  imessage: 'bg-green-500/20 text-green-400 border-green-500/30',
}

const AGENT_EXPECTED_GAP: Record<string, number> = {
  scraper: 3,
  webhooks: 5,
}

const FIELDS = ['company_name', 'amount_usd', 'funding_type', 'location', 'ceo_name', 'website', 'investors', 'lead_investor']

const FIELD_LABELS: Record<string, string> = {
  company_name: 'Company Name',
  amount_usd: 'Amount (USD)',
  funding_type: 'Funding Type',
  location: 'Location',
  ceo_name: 'CEO Name',
  website: 'Website',
  investors: 'Investors',
  lead_investor: 'Lead Investor',
}

function agentBadge(agent: string) {
  const colors = AGENT_COLORS[agent] || 'bg-slate-500/20 text-slate-400 border-slate-500/30'
  return `inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${colors}`
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m ago`
  const hrs = Math.floor(min / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function formatDuration(ms: number | null): string {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatAmount(usd: number | null): string {
  if (!usd || usd <= 0) return '—'
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(0)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`
  return `$${usd}`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min.toFixed(0)}m`
  if (min < 1440) return `${(min / 60).toFixed(1)}h`
  return `${(min / 1440).toFixed(1)}d`
}

function classificationBadge(c: string | null) {
  if (c === 'FUNDING') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
  if (c === 'NOT_FUNDING') return 'bg-red-500/20 text-red-400 border-red-500/30'
  return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
}

function verdictColor(v: string) {
  if (v === 'CORRECT') return 'text-emerald-400'
  if (v === 'INCORRECT') return 'text-red-400'
  if (v === 'UNVERIFIABLE') return 'text-slate-500'
  return 'text-slate-600'
}

function verdictLabel(v: string) {
  if (v === 'CORRECT') return 'Correct'
  if (v === 'INCORRECT') return 'Incorrect'
  if (v === 'UNVERIFIABLE') return 'Unverifiable'
  if (v === 'NOT_EXTRACTED') return 'Not extracted'
  return v
}

function parseJsonField<T>(value: T | string | null): T | null {
  if (!value) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return value
}

// ---------------------------------------------------------------------------
// Uptime calculation
// ---------------------------------------------------------------------------

interface UptimeStats {
  agent: string
  totalRuns: number
  onTimeRuns: number
  uptimePct: number
  totalDowntimeMin: number
  longestGapMin: number
}

function computeUptime(runs: AgentRun[]): UptimeStats[] {
  const byAgent: Record<string, AgentRun[]> = {}
  for (const r of runs) {
    if (!byAgent[r.agent]) byAgent[r.agent] = []
    byAgent[r.agent].push(r)
  }

  const results: UptimeStats[] = []
  for (const [agent, agentRuns] of Object.entries(byAgent)) {
    const maxGap = AGENT_EXPECTED_GAP[agent]
    if (!maxGap || agentRuns.length < 2) {
      results.push({ agent, totalRuns: agentRuns.length, onTimeRuns: agentRuns.length, uptimePct: 100, totalDowntimeMin: 0, longestGapMin: 0 })
      continue
    }
    const sorted = [...agentRuns].sort((a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime())
    let onTime = 1
    let totalDowntime = 0
    let longestGap = 0
    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i].run_at).getTime() - new Date(sorted[i - 1].run_at).getTime()) / 60000
      if (gap <= maxGap) {
        onTime++
      } else {
        totalDowntime += gap - maxGap
        if (gap > longestGap) longestGap = gap
      }
    }
    const uptimePct = sorted.length > 0 ? (onTime / sorted.length) * 100 : 100
    results.push({ agent, totalRuns: sorted.length, onTimeRuns: onTime, uptimePct, totalDowntimeMin: totalDowntime, longestGapMin: longestGap })
  }
  return results.sort((a, b) => a.uptimePct - b.uptimePct)
}

// ---------------------------------------------------------------------------
// Usage aggregation
// ---------------------------------------------------------------------------

interface DailyUsage {
  date: string
  runs: number
  articles: number
  apiCalls: number
  inputTokens: number
  outputTokens: number
  estimatedCost: number
  hasTokenData: boolean
}

function aggregateUsageByDay(agentRuns: AgentRun[]): DailyUsage[] {
  const scraperRuns = agentRuns.filter(r => r.agent === 'scraper')
  const byDate = new Map<string, DailyUsage>()

  for (const run of scraperRuns) {
    const date = run.run_at.slice(0, 10) // YYYY-MM-DD
    const existing = byDate.get(date) || {
      date,
      runs: 0,
      articles: 0,
      apiCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
      estimatedCost: 0,
      hasTokenData: false,
    }

    existing.runs++
    // The `summary` column is TEXT in the DB (the scraper writes
    // `json.dumps(...)` into it), so Supabase returns it as a string
    // here — NOT as a parsed object. Previous code cast-as-object and
    // silently read `undefined` for every field, which is why the Usage
    // tab showed '—' for tokens/cost even though the data existed.
    let s: Record<string, number> | null = null
    const raw = run.summary as unknown
    if (typeof raw === 'string' && raw.length > 0) {
      try {
        s = JSON.parse(raw) as Record<string, number>
      } catch {
        s = null
      }
    } else if (raw && typeof raw === 'object') {
      s = raw as Record<string, number>
    }
    if (s) {
      existing.articles += s.new_articles || 0
      if (s.api_calls !== undefined) {
        existing.hasTokenData = true
        existing.apiCalls += s.api_calls || 0
        existing.inputTokens += s.input_tokens || 0
        existing.outputTokens += s.output_tokens || 0
        existing.estimatedCost += s.estimated_cost_usd || 0
      }
    }
    byDate.set(date, existing)
  }

  return Array.from(byDate.values()).sort((a, b) => b.date.localeCompare(a.date))
}

// ---------------------------------------------------------------------------
// Shared components
// ---------------------------------------------------------------------------

function SummaryCard({ label, value, sub, color, onClick, active }: {
  label: string
  value: string
  sub?: string
  color?: string
  onClick?: () => void
  active?: boolean
}) {
  const borderClass = color === 'emerald' ? 'border-emerald-500/30 bg-emerald-500/5' :
                      color === 'red' ? 'border-red-500/30 bg-red-500/5' :
                      color === 'amber' ? 'border-amber-500/30 bg-amber-500/5' :
                      color === 'blue' ? 'border-blue-500/30 bg-blue-500/5' :
                      'border-slate-700/50 bg-slate-900'
  const textClass = color === 'emerald' ? 'text-emerald-400' :
                    color === 'red' ? 'text-red-400' :
                    color === 'amber' ? 'text-amber-400' :
                    color === 'blue' ? 'text-blue-300' :
                    'text-white'
  const interactive = typeof onClick === 'function'
  const ringClass = active ? 'ring-2 ring-emerald-400/60' : ''
  const hoverClass = interactive ? 'cursor-pointer hover:bg-slate-800/40 transition-colors' : ''
  const Wrapper = interactive ? 'button' : 'div'
  return (
    <Wrapper
      onClick={onClick}
      className={`rounded-xl border px-4 py-3 text-left w-full ${borderClass} ${ringClass} ${hoverClass}`}
    >
      <div className="text-xs text-slate-400">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${textClass}`}>{value}</div>
      {sub && <div className="text-[10px] text-slate-500 mt-0.5">{sub}</div>}
    </Wrapper>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AdminClient({
  agentRuns,
  audits,
  userFlags,
  qualityStats,
  userRows,
  userStats,
  engagementRows,
  engagementStats,
  funnel,
  topPages,
  anonymousDaily,
  eventsTableMissing,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('users')
  const [runsExpanded, setRunsExpanded] = useState(false)
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null)
  const [usagePeriod, setUsagePeriod] = useState<7 | 30 | 90>(30)

  const uptimeStats = useMemo(() => computeUptime(agentRuns), [agentRuns])
  const dailyUsage = useMemo(() => aggregateUsageByDay(agentRuns), [agentRuns])
  const tableRuns = runsExpanded ? agentRuns.slice(0, 100) : agentRuns.slice(0, 5)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'users', label: 'Users' },
    { key: 'engagement', label: 'Engagement' },
    { key: 'quality', label: 'Quality' },
    { key: 'usage', label: 'Usage' },
  ]

  return (
    <div className="space-y-6 pb-12">
      {/* Header + Tabs */}
      <div>
        <h1 className="text-2xl font-bold text-white">Admin</h1>
        <p className="text-sm text-slate-400 mt-1">Users, quality monitoring, and API usage</p>
        <div className="flex gap-1 mt-4 border-b border-slate-700/50">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? 'text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && (
        <UsersTab rows={userRows} stats={userStats} />
      )}
      {activeTab === 'engagement' && (
        <EngagementTab
          rows={engagementRows}
          stats={engagementStats}
          funnel={funnel}
          topPages={topPages}
          anonymousDaily={anonymousDaily}
          eventsTableMissing={eventsTableMissing}
        />
      )}
      {activeTab === 'quality' && (
        <QualityTab
          agentRuns={agentRuns}
          audits={audits}
          userFlags={userFlags}
          stats={qualityStats}
          runsExpanded={runsExpanded}
          setRunsExpanded={setRunsExpanded}
          expandedAudit={expandedAudit}
          setExpandedAudit={setExpandedAudit}
          tableRuns={tableRuns}
          uptimeStats={uptimeStats}
        />
      )}
      {activeTab === 'usage' && (
        <UsageTab
          dailyUsage={dailyUsage}
          period={usagePeriod}
          setPeriod={setUsagePeriod}
        />
      )}
    </div>
  )
}

// ===========================================================================
// Users Tab
// ===========================================================================

function UsersTab({ rows, stats }: { rows: UserRow[]; stats: UserStats }) {
  return (
    <>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard label="Total" value={stats.totalUsers.toString()} />
        <SummaryCard label="Pro" value={stats.totalPro.toString()} color="emerald" />
        <SummaryCard label="Free" value={stats.totalFree.toString()} />
        <SummaryCard label="MRR (paid)" value={`$${stats.mrr}`} sub={`${stats.totalPaying} × $89`} color="blue" />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700/50">
              <tr className="text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-3 text-left font-semibold">User</th>
                <th className="px-3 py-3 text-left font-semibold">Plan</th>
                <th className="px-3 py-3 text-left font-semibold">Signed up</th>
                <th className="px-3 py-3 text-left font-semibold">LinkedIn</th>
                <th className="px-3 py-3 text-left font-semibold">Filters</th>
                <th className="px-3 py-3 text-left font-semibold">Channels</th>
                <th className="px-3 py-3 text-right font-semibold">Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {rows.map(row => {
                const channels: string[] = []
                if (row.slack_webhook_url || row.slack_channel_email) channels.push('Slack')
                if (row.teams_webhook_url || row.teams_channel_email) channels.push('Teams')
                if (row.telegram_chat_id) channels.push('Telegram')
                if (row.phone_verified && row.phone_number) channels.push('SMS')
                if (row.imessage_enabled) channels.push('iMsg')
                if (row.push_subscription) channels.push('Push')

                const range = row.min_amount && row.max_amount
                  ? `${formatAmount(row.min_amount)} – ${formatAmount(row.max_amount)}`
                  : '—'
                const stages = (row.funding_types || []).slice(0, 3).join(', ')
                  + ((row.funding_types?.length || 0) > 3 ? '…' : '')
                const cos = (row.countries || []).slice(0, 4).join(', ')
                  + ((row.countries?.length || 0) > 4 ? '…' : '')

                return (
                  <tr key={row.id} className="bg-slate-950 hover:bg-slate-900/80 transition-colors">
                    <td className="px-3 py-3">
                      <div className="text-white font-medium truncate max-w-[200px]">
                        {row.full_name || <span className="text-slate-500 italic">no name</span>}
                      </div>
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">{row.email}</div>
                      {row.company && (
                        <div className="text-[10px] text-slate-500 truncate max-w-[200px] mt-0.5">{row.company}</div>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        row.plan === 'pro'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-slate-700 text-slate-300 border border-slate-600'
                      }`}>
                        {row.plan.toUpperCase()}
                      </span>
                      {row.plan === 'pro' && row.stripe_customer_id && (
                        <div className="text-[9px] text-slate-500 mt-1">paid</div>
                      )}
                      {row.plan === 'pro' && !row.stripe_customer_id && (
                        <div className="text-[9px] text-amber-400 mt-1">manual</div>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400 whitespace-nowrap">{formatDate(row.created_at)}</td>
                    <td className="px-3 py-3 text-xs">
                      {row.linkedin_url ? (
                        <a href={row.linkedin_url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 truncate inline-block max-w-[140px]">
                          {row.linkedin_url.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//, '@')}
                        </a>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-400">
                      <div className="text-slate-300">{range}</div>
                      {stages && <div className="text-[10px] text-slate-500">{stages}</div>}
                      {cos && <div className="text-[10px] text-slate-500">{cos}</div>}
                    </td>
                    <td className="px-3 py-3 text-xs">
                      {channels.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {channels.map(ch => (
                            <span key={ch} className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                              {ch}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-600">none</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-right text-xs text-slate-300">{row.alert_count.toLocaleString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-xs text-slate-500">{rows.length} accounts</div>
    </>
  )
}

// ===========================================================================
// Quality Tab
// ===========================================================================

function QualityTab({
  agentRuns,
  audits,
  userFlags,
  stats,
  runsExpanded,
  setRunsExpanded,
  expandedAudit,
  setExpandedAudit,
  tableRuns,
  uptimeStats,
}: {
  agentRuns: AgentRun[]
  audits: AuditRow[]
  userFlags: UserFlag[]
  stats: QualityStats
  runsExpanded: boolean
  setRunsExpanded: (v: boolean) => void
  expandedAudit: string | null
  setExpandedAudit: (v: string | null) => void
  tableRuns: AgentRun[]
  uptimeStats: UptimeStats[]
}) {
  return (
    <>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Total Audited" value={stats.totalAudited.toString()} />
        <SummaryCard
          label="Accuracy"
          value={`${(stats.avgAccuracy * 100).toFixed(0)}%`}
          color={stats.avgAccuracy >= 0.8 ? 'emerald' : stats.avgAccuracy >= 0.6 ? 'amber' : 'red'}
        />
        <SummaryCard
          label="False Positive Rate"
          value={`${(stats.fpRate * 100).toFixed(0)}%`}
          color={stats.fpRate <= 0.1 ? 'emerald' : stats.fpRate <= 0.25 ? 'amber' : 'red'}
        />
        <SummaryCard label="FUNDING" value={stats.fundingCount.toString()} color="emerald" />
        <SummaryCard label="NOT_FUNDING" value={stats.notFundingCount.toString()} color="red" />
      </div>

      {/* Recent Audit Results */}
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-white">Recent Audit Results</h2>
          <p className="text-xs text-slate-400">Click a row to see full reasoning and field details</p>
        </div>
        <div className="divide-y divide-slate-800/50">
          {audits.slice(0, 30).map(audit => {
            const isExpanded = expandedAudit === audit.id
            const verdicts = parseJsonField<Record<string, string>>(audit.field_verdicts)
            const notes = parseJsonField<Record<string, string>>(audit.field_notes)
            return (
              <div key={audit.id}>
                <button
                  onClick={() => setExpandedAudit(isExpanded ? null : audit.id)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800/30 transition-colors flex items-center gap-4"
                >
                  <div className="w-[200px] flex-shrink-0">
                    <div className="text-sm text-white font-medium truncate">{audit.funding_round?.company_name || '—'}</div>
                    <div className="text-[11px] text-slate-500">
                      {audit.funding_round ? `${formatAmount(audit.funding_round.amount_usd)} ${audit.funding_round.funding_type}` : ''}
                    </div>
                  </div>
                  <div className="w-[120px] flex-shrink-0 text-xs text-slate-400 truncate">{audit.funding_round?.source_feed || '—'}</div>
                  <div className="w-[120px] flex-shrink-0">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${classificationBadge(audit.classification)}`}>
                      {audit.classification || '—'}
                    </span>
                  </div>
                  <div className="w-[60px] flex-shrink-0 text-right">
                    <span className={`text-sm font-medium ${
                      (audit.accuracy_score ?? 0) >= 0.8 ? 'text-emerald-400' :
                      (audit.accuracy_score ?? 0) >= 0.6 ? 'text-amber-400' : 'text-red-400'
                    }`}>
                      {audit.accuracy_score !== null ? `${(audit.accuracy_score * 100).toFixed(0)}%` : '—'}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0 text-xs text-slate-400 truncate">{audit.classification_reasoning || '—'}</div>
                  <svg className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {isExpanded && (
                  <div className="px-4 pb-4 bg-slate-800/20 border-t border-slate-800/50">
                    <div className="mt-3">
                      <div className="text-xs font-medium text-slate-400 mb-1">Classification Reasoning</div>
                      <p className="text-sm text-slate-200 leading-relaxed">{audit.classification_reasoning || 'No reasoning provided'}</p>
                    </div>
                    {verdicts && (
                      <div className="mt-4">
                        <div className="text-xs font-medium text-slate-400 mb-2">Field-Level Accuracy</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(verdicts).map(([field, verdict]) => {
                            const note = notes?.[field]
                            return (
                              <div key={field} className={`rounded-lg px-3 py-2 border ${
                                verdict === 'CORRECT' ? 'border-emerald-500/20 bg-emerald-500/5' :
                                verdict === 'INCORRECT' ? 'border-red-500/20 bg-red-500/5' :
                                'border-slate-700/50 bg-slate-800/30'
                              }`}>
                                <div className="text-[11px] text-slate-400 font-medium">{FIELD_LABELS[field] || field}</div>
                                <div className={`text-xs font-semibold mt-0.5 ${verdictColor(verdict)}`}>{verdictLabel(verdict)}</div>
                                {note && <div className="text-[11px] text-slate-400 mt-1 leading-snug">{note}</div>}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                    {audit.latency_seconds !== null && (
                      <div className="mt-3 text-xs text-slate-500">
                        Latency: {Math.round(audit.latency_seconds / 60)} minutes from publish to alert
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {audits.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500 text-sm">No audit data yet. Run the watchdog to see results.</div>
          )}
        </div>
      </section>

      {/* Agent Runs */}
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setRunsExpanded(!runsExpanded)}
          className="w-full px-4 py-3 border-b border-slate-700/50 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        >
          <div className="text-left">
            <h2 className="text-base font-semibold text-white">Agent Runs</h2>
            <p className="text-xs text-slate-400">
              All time — {agentRuns.length} runs
              {agentRuns.length > 0 && ` (since ${new Date(agentRuns[agentRuns.length - 1].run_at).toLocaleDateString()})`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {runsExpanded ? `Showing 100 of ${agentRuns.length}` : `Showing ${tableRuns.length} of ${agentRuns.length}`}
            </span>
            <svg className={`w-4 h-4 text-slate-400 transition-transform ${runsExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {uptimeStats.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-800/20">
            <div className="text-xs font-medium text-slate-400 mb-2">Agent Uptime</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {uptimeStats.map(s => (
                <div key={s.agent} className="flex items-center gap-3">
                  <span className={agentBadge(s.agent)}>{s.agent}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all ${
                            s.uptimePct >= 95 ? 'bg-emerald-500' : s.uptimePct >= 80 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${s.uptimePct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold tabular-nums ${
                        s.uptimePct >= 95 ? 'text-emerald-400' : s.uptimePct >= 80 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {s.uptimePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex gap-2 text-[10px] text-slate-500">
                      <span>{s.onTimeRuns}/{s.totalRuns} on time</span>
                      {s.totalDowntimeMin > 0 && <span className="text-red-400/70">{formatMinutes(s.totalDowntimeMin)} downtime</span>}
                      {s.longestGapMin > 0 && <span className="text-slate-600">longest gap: {formatMinutes(s.longestGapMin)}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-2 font-medium">Agent</th>
                <th className="px-4 py-2 font-medium">Run Time</th>
                <th className="px-4 py-2 font-medium">Domain</th>
                <th className="px-4 py-2 font-medium text-right">Items</th>
                <th className="px-4 py-2 font-medium text-right">Errors</th>
                <th className="px-4 py-2 font-medium text-right">Duration</th>
                <th className="px-4 py-2 font-medium">Learnings</th>
              </tr>
            </thead>
            <tbody>
              {tableRuns.map(run => (
                <tr key={run.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-2"><span className={agentBadge(run.agent)}>{run.agent}</span></td>
                  <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{timeAgo(run.run_at)}</td>
                  <td className="px-4 py-2 text-slate-500">{run.domain || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={run.items > 0 ? 'text-emerald-400 font-medium' : 'text-slate-500'}>{run.items}</span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={run.errors > 0 ? 'text-red-400 font-medium' : 'text-slate-500'}>{run.errors}</span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-400">{formatDuration(run.duration_ms)}</td>
                  <td className="px-4 py-2 text-slate-400 max-w-xs truncate text-xs">{run.learnings || '—'}</td>
                </tr>
              ))}
              {agentRuns.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">No agent runs logged yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        {!runsExpanded && agentRuns.length > 5 && (
          <button
            onClick={() => setRunsExpanded(true)}
            className="w-full py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800/30 transition-colors border-t border-slate-800/50"
          >
            Show more (up to 100 of {agentRuns.length} runs)
          </button>
        )}
      </section>

      {/* Source + Field Accuracy */}
      <div className="grid md:grid-cols-2 gap-4">
        <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="text-base font-semibold text-white">Accuracy by Source</h2>
            <p className="text-xs text-slate-400">Which RSS feeds produce false positives?</p>
          </div>
          <div className="p-4 space-y-3">
            {stats.sortedSources.map(([source, s]) => {
              const fpPct = s.total ? (s.not_funding / s.total) * 100 : 0
              const goodPct = s.total ? (s.funding / s.total) * 100 : 0
              return (
                <div key={source}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-slate-300 truncate max-w-[200px]">{source}</span>
                    <span className="text-xs text-slate-500">{s.total} audited</span>
                  </div>
                  <div className="flex h-2 rounded-full overflow-hidden bg-slate-800">
                    <div className="bg-emerald-500 transition-all" style={{ width: `${goodPct}%` }} />
                    <div className="bg-red-500 transition-all" style={{ width: `${fpPct}%` }} />
                  </div>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-[10px] text-emerald-400">{s.funding} funding</span>
                    {s.not_funding > 0 && <span className="text-[10px] text-red-400">{s.not_funding} false pos</span>}
                  </div>
                </div>
              )
            })}
            {stats.sortedSources.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">No source data yet</p>
            )}
          </div>
        </section>

        <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="text-base font-semibold text-white">Accuracy by Field</h2>
            <p className="text-xs text-slate-400">Which extracted fields are most often wrong?</p>
          </div>
          <div className="p-4 space-y-3">
            {FIELDS.map(field => {
              const s = stats.fieldStats[field]
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

      {/* User Flags */}
      {userFlags.length > 0 && (
        <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="text-base font-semibold text-white">User Flags</h2>
            <p className="text-xs text-slate-400">Ground truth feedback from users</p>
          </div>
          <div className="divide-y divide-slate-800/50">
            {userFlags.map(flag => (
              <div key={flag.id} className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm text-white">{flag.funding_round?.company_name || '—'}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  flag.user_flag === 'not_funding' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                  flag.user_flag === 'duplicate' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                  'bg-blue-500/20 text-blue-400 border-blue-500/30'
                }`}>
                  {flag.user_flag.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

// ===========================================================================
// Usage Tab
// ===========================================================================

function UsageTab({
  dailyUsage,
  period,
  setPeriod,
}: {
  dailyUsage: DailyUsage[]
  period: 7 | 30 | 90
  setPeriod: (v: 7 | 30 | 90) => void
}) {
  const filtered = dailyUsage.slice(0, period)

  // Compute period totals
  const totals = filtered.reduce(
    (acc, d) => ({
      runs: acc.runs + d.runs,
      articles: acc.articles + d.articles,
      apiCalls: acc.apiCalls + d.apiCalls,
      inputTokens: acc.inputTokens + d.inputTokens,
      outputTokens: acc.outputTokens + d.outputTokens,
      cost: acc.cost + d.estimatedCost,
    }),
    { runs: 0, articles: 0, apiCalls: 0, inputTokens: 0, outputTokens: 0, cost: 0 },
  )

  // Today's stats
  const today = filtered[0]
  const todayCost = today?.estimatedCost ?? 0
  const todayCalls = today?.apiCalls ?? 0

  // Max daily cost for bar scaling
  const maxCost = Math.max(...filtered.map(d => d.estimatedCost), 0.01)

  const hasAnyTokenData = filtered.some(d => d.hasTokenData)

  function formatTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
    return n.toString()
  }

  return (
    <>
      {/* Period selector */}
      <div className="flex gap-1">
        {([7, 30, 90] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              period === p
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            {p}d
          </button>
        ))}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="Today's Cost"
          value={todayCost > 0 ? `$${todayCost.toFixed(2)}` : '—'}
          sub={todayCalls > 0 ? `${todayCalls} API calls` : undefined}
          color={todayCost > 1 ? 'amber' : undefined}
        />
        <SummaryCard
          label={`${period}d Cost`}
          value={totals.cost > 0 ? `$${totals.cost.toFixed(2)}` : '—'}
          sub={totals.apiCalls > 0 ? `${totals.apiCalls.toLocaleString()} calls` : undefined}
        />
        <SummaryCard
          label={`${period}d Tokens`}
          value={totals.inputTokens > 0 ? formatTokens(totals.inputTokens + totals.outputTokens) : '—'}
          sub={totals.inputTokens > 0 ? `${formatTokens(totals.inputTokens)} in / ${formatTokens(totals.outputTokens)} out` : undefined}
        />
        <SummaryCard
          label={`${period}d Articles`}
          value={totals.articles.toLocaleString()}
          sub={`${totals.runs.toLocaleString()} pipeline runs`}
        />
      </div>

      {!hasAnyTokenData && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl px-4 py-3 text-sm text-amber-300">
          Token tracking was just enabled. Cost data will appear after the next pipeline run processes new articles.
        </div>
      )}

      {/* Cost Trend */}
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-white">Daily Cost Trend</h2>
          <p className="text-xs text-slate-400">Estimated Anthropic API spend (Haiku 4.5)</p>
        </div>
        <div className="p-4">
          <div className="flex items-end gap-[2px] h-32">
            {[...filtered].reverse().map(d => {
              const height = maxCost > 0 ? (d.estimatedCost / maxCost) * 100 : 0
              const isHigh = d.estimatedCost > totals.cost / filtered.length * 2
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center justify-end h-full group relative">
                  <div
                    className={`w-full rounded-t transition-all ${
                      isHigh ? 'bg-amber-500' : d.estimatedCost > 0 ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white whitespace-nowrap z-10">
                    <div className="font-medium">{d.date}</div>
                    <div className="text-slate-400">${d.estimatedCost.toFixed(3)} · {d.apiCalls} calls</div>
                  </div>
                </div>
              )
            })}
          </div>
          {filtered.length > 0 && (
            <div className="flex justify-between mt-1 text-[10px] text-slate-500">
              <span>{filtered[filtered.length - 1]?.date}</span>
              <span>{filtered[0]?.date}</span>
            </div>
          )}
        </div>
      </section>

      {/* Daily Breakdown Table */}
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-white">Daily Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-800">
                <th className="px-4 py-2 font-medium">Date</th>
                <th className="px-4 py-2 font-medium text-right">Runs</th>
                <th className="px-4 py-2 font-medium text-right">Articles</th>
                <th className="px-4 py-2 font-medium text-right">API Calls</th>
                <th className="px-4 py-2 font-medium text-right">Tokens (in/out)</th>
                <th className="px-4 py-2 font-medium text-right">Est. Cost</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(d => (
                <tr key={d.date} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-2 text-slate-300 font-medium whitespace-nowrap">{d.date}</td>
                  <td className="px-4 py-2 text-right text-slate-400">{d.runs.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right text-slate-400">{d.articles.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">
                    {d.hasTokenData ? (
                      <span className="text-slate-300">{d.apiCalls.toLocaleString()}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    {d.hasTokenData ? (
                      <span className="text-slate-400">{formatTokens(d.inputTokens)} / {formatTokens(d.outputTokens)}</span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {d.hasTokenData ? (
                      <span className={`font-medium ${d.estimatedCost > 0.50 ? 'text-amber-400' : 'text-emerald-400'}`}>
                        ${d.estimatedCost.toFixed(3)}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-500">No pipeline runs recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

// ===========================================================================
// Engagement Tab
// ===========================================================================

function lastSignInLabel(iso: string | null): string {
  if (!iso) return 'Never'
  return timeAgo(iso)
}

function engagementScore(r: EngagementRow): number {
  const now = Date.now()
  const ageDays = r.last_sign_in_at
    ? (now - new Date(r.last_sign_in_at).getTime()) / (24 * 60 * 60 * 1000)
    : Infinity
  const loginPts = ageDays <= 7 ? 30 : ageDays <= 30 ? 15 : 0
  const engagedPts = r.engaged_with_alert ? 25 : 0
  const bookmarkPts = Math.min(r.bookmarks * 5, 20)
  const channelPts = Math.min(r.channels_configured * 5, 25)
  return loginPts + engagedPts + bookmarkPts + channelPts
}

function scoreColor(score: number): string {
  if (score >= 70) return 'text-emerald-400'
  if (score >= 40) return 'text-amber-400'
  if (score >= 15) return 'text-slate-300'
  return 'text-red-400'
}

function formatTimeOnSite(min: number): string {
  if (min === 0) return '—'
  if (min < 60) return `${min}m`
  return `${(min / 60).toFixed(1)}h`
}

function EngagementTab({
  rows,
  stats,
  funnel,
  topPages,
  anonymousDaily,
  eventsTableMissing,
}: {
  rows: EngagementRow[]
  stats: EngagementStats
  funnel: Funnel
  topPages: [string, number][]
  anonymousDaily: AnonymousDay[]
  eventsTableMissing: boolean
}) {
  type SortKey = 'score' | 'lastLogin' | 'reads' | 'bookmarks' | 'time'
  type Filter = 'all' | 'active7d' | 'active30d' | 'neverLoggedIn' | 'zombie' | 'activated'
  const [sortKey, setSortKey] = useState<SortKey>('lastLogin')
  const [filter, setFilter] = useState<Filter>('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return rows
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now()
    const within = (iso: string | null, days: number) =>
      iso !== null && now - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000
    return rows.filter(r => {
      if (filter === 'active7d') return within(r.last_sign_in_at, 7)
      if (filter === 'active30d') return within(r.last_sign_in_at, 30)
      if (filter === 'neverLoggedIn') return r.last_sign_in_at === null
      if (filter === 'zombie') return r.last_sign_in_at !== null && !r.engaged_with_alert && r.channels_configured === 0
      if (filter === 'activated') return r.last_sign_in_at !== null && r.engaged_with_alert && r.channels_configured > 0
      return true
    })
  }, [rows, filter])

  const sorted = useMemo(() => {
    const copy = [...filtered]
    if (sortKey === 'score') {
      copy.sort((a, b) => engagementScore(b) - engagementScore(a))
    } else if (sortKey === 'lastLogin') {
      copy.sort((a, b) => {
        const at = a.last_sign_in_at ? new Date(a.last_sign_in_at).getTime() : 0
        const bt = b.last_sign_in_at ? new Date(b.last_sign_in_at).getTime() : 0
        return bt - at
      })
    } else if (sortKey === 'reads') {
      copy.sort((a, b) => Number(b.engaged_with_alert) - Number(a.engaged_with_alert))
    } else if (sortKey === 'bookmarks') {
      copy.sort((a, b) => b.bookmarks - a.bookmarks)
    } else if (sortKey === 'time') {
      copy.sort((a, b) => b.time_on_site_7d_min - a.time_on_site_7d_min)
    }
    return copy
  }, [filtered, sortKey])

  const toggleFilter = (next: Filter) => setFilter(prev => prev === next ? 'all' : next)
  const filterLabel: Record<Filter, string> = {
    all: 'all users',
    active7d: 'active in last 7 days',
    active30d: 'active in last 30 days',
    neverLoggedIn: 'never logged in',
    zombie: 'zombies (logged in, no engagement)',
    activated: 'activated (login + read + channel)',
  }

  const funnelSteps = [
    { label: 'Signed up', count: funnel.signedUp },
    { label: 'Logged in ≥1×', count: funnel.loggedIn },
    { label: 'Logged in 3+×', count: funnel.loggedIn3Plus },
    { label: 'Engaged with alert', count: funnel.readAlert },
    { label: 'Bookmarked', count: funnel.bookmarked },
    { label: 'Set up channel', count: funnel.configuredChannel },
  ]
  const funnelMax = funnelSteps[0].count || 1

  return (
    <>
      {/* Stats — clickable to filter the table below */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <SummaryCard label="Total users" value={stats.total.toString()} onClick={() => toggleFilter('all')} active={filter === 'all'} />
        <SummaryCard label="Active 7d" value={stats.active7d.toString()} color="emerald" onClick={() => toggleFilter('active7d')} active={filter === 'active7d'} />
        <SummaryCard label="Active 30d" value={stats.active30d.toString()} color="blue" onClick={() => toggleFilter('active30d')} active={filter === 'active30d'} />
        <SummaryCard label="Never logged in" value={stats.neverLoggedIn.toString()} color={stats.neverLoggedIn > 0 ? 'red' : undefined} onClick={() => toggleFilter('neverLoggedIn')} active={filter === 'neverLoggedIn'} />
        <SummaryCard label="Zombie" value={stats.zombie.toString()} sub="logged in, no engagement" color={stats.zombie > 0 ? 'amber' : undefined} onClick={() => toggleFilter('zombie')} active={filter === 'zombie'} />
        <SummaryCard label="Activated" value={stats.activated.toString()} sub="login + read + channel" color="emerald" onClick={() => toggleFilter('activated')} active={filter === 'activated'} />
      </div>

      {eventsTableMissing && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-200">
          Page-tracker events table not found. Time-on-site, sessions, top pages, and anonymous traffic
          will populate after the <code className="text-xs bg-slate-900 px-1.5 py-0.5 rounded">user_events</code> migration is applied.
        </div>
      )}

      {/* Activation funnel */}
      <section className="rounded-xl border border-slate-700/50 bg-slate-900 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-white">Activation funnel</h2>
          <p className="text-xs text-slate-400">Signup → first login → first alert read → bookmark → channel set up</p>
        </div>
        <div className="p-4 space-y-2">
          {funnelSteps.map((step, i) => {
            const pct = (step.count / funnelMax) * 100
            const drop = i > 0 ? funnelSteps[i - 1].count - step.count : 0
            return (
              <div key={step.label} className="flex items-center gap-3">
                <div className="w-32 text-sm text-slate-300">{step.label}</div>
                <div className="flex-1 h-7 bg-slate-950 rounded-md overflow-hidden border border-slate-800">
                  <div
                    className="h-full bg-emerald-500/60 flex items-center px-2 text-xs font-semibold text-white transition-all"
                    style={{ width: `${pct}%` }}
                  >
                    {step.count}
                  </div>
                </div>
                <div className="w-24 text-right text-xs text-slate-400">
                  {i === 0 ? '—' : drop > 0 ? `−${drop} dropped` : 'no drop'}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* Top pages + Anonymous traffic */}
      <div className="grid md:grid-cols-2 gap-4">
        <section className="rounded-xl border border-slate-700/50 bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="text-base font-semibold text-white">Top pages (logged-in)</h2>
            <p className="text-xs text-slate-400">Most-visited dashboard pages, last 30 days</p>
          </div>
          <div className="p-4">
            {topPages.length === 0 ? (
              <p className="text-sm text-slate-500">No page-view data yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {topPages.map(([path, count]) => (
                  <li key={path} className="flex items-center justify-between text-sm">
                    <code className="text-slate-300 truncate">{path}</code>
                    <span className="text-slate-400 ml-2 tabular-nums">{count}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="rounded-xl border border-slate-700/50 bg-slate-900 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="text-base font-semibold text-white">Anonymous landing traffic</h2>
            <p className="text-xs text-slate-400">Distinct anonymous visitors per day</p>
          </div>
          <div className="p-4">
            {anonymousDaily.length === 0 ? (
              <p className="text-sm text-slate-500">No anonymous traffic recorded yet.</p>
            ) : (
              <ul className="space-y-1">
                {anonymousDaily.map(d => (
                  <li key={d.date} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400 tabular-nums">{d.date}</span>
                    <span className="text-slate-200 font-medium tabular-nums">{d.visitors}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      {/* Per-user table */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-900 flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-base font-semibold text-white">Per-user engagement</h2>
            <p className="text-xs text-slate-400">Click a stat card above to filter; click a column header to sort</p>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500">
            <span>
              Showing <span className="text-slate-300">{filterLabel[filter]}</span> ({sorted.length})
            </span>
            {filter !== 'all' && (
              <button
                onClick={() => setFilter('all')}
                className="px-2 py-1 rounded-md border border-slate-700 hover:border-slate-500 hover:text-slate-200 transition-colors"
              >Clear filter</button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 border-b border-slate-700/50">
              <tr className="text-xs uppercase tracking-wider text-slate-400">
                <th className="px-3 py-3 text-left font-semibold">User</th>
                <th className="px-3 py-3 text-left font-semibold">Plan</th>
                <th className="px-3 py-3 text-left font-semibold">Joined</th>
                <th
                  onClick={() => setSortKey('lastLogin')}
                  className={`px-3 py-3 text-left font-semibold cursor-pointer hover:text-slate-200 ${sortKey === 'lastLogin' ? 'text-white' : ''}`}
                >Last login {sortKey === 'lastLogin' && '↓'}</th>
                <th
                  onClick={() => setSortKey('time')}
                  className={`px-3 py-3 text-right font-semibold cursor-pointer hover:text-slate-200 ${sortKey === 'time' ? 'text-white' : ''}`}
                >Time 7d {sortKey === 'time' && '↓'}</th>
                <th className="px-3 py-3 text-right font-semibold">Sessions 7d</th>
                <th
                  onClick={() => setSortKey('reads')}
                  className={`px-3 py-3 text-right font-semibold cursor-pointer hover:text-slate-200 ${sortKey === 'reads' ? 'text-white' : ''}`}
                  title="Clicked through to a company page or article"
                >Engaged {sortKey === 'reads' && '↓'}</th>
                <th
                  onClick={() => setSortKey('bookmarks')}
                  className={`px-3 py-3 text-right font-semibold cursor-pointer hover:text-slate-200 ${sortKey === 'bookmarks' ? 'text-white' : ''}`}
                >Bookmarks {sortKey === 'bookmarks' && '↓'}</th>
                <th className="px-3 py-3 text-right font-semibold">Channels</th>
                <th
                  onClick={() => setSortKey('score')}
                  className={`px-3 py-3 text-right font-semibold cursor-pointer hover:text-slate-200 ${sortKey === 'score' ? 'text-white' : ''}`}
                >Score {sortKey === 'score' && '↓'}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => {
                const score = engagementScore(r)
                const neverLoggedIn = r.last_sign_in_at === null
                return (
                  <tr key={r.id} className="bg-slate-950 hover:bg-slate-900/80 transition-colors border-b border-slate-800/50">
                    <td className="px-3 py-3">
                      <div className="text-slate-200 font-medium">{r.full_name || '—'}</div>
                      <div className="text-xs text-slate-500">{r.email}</div>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                        r.plan === 'pro'
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                          : 'bg-slate-700/40 text-slate-300 border-slate-600/40'
                      }`}>{r.plan}</span>
                    </td>
                    <td className="px-3 py-3 text-slate-400 text-xs">{formatDate(r.created_at)}</td>
                    <td className={`px-3 py-3 text-xs ${neverLoggedIn ? 'text-red-400' : 'text-slate-300'}`}>
                      {lastSignInLabel(r.last_sign_in_at)}
                    </td>
                    <td className="px-3 py-3 text-right text-slate-300 tabular-nums">{formatTimeOnSite(r.time_on_site_7d_min)}</td>
                    <td className="px-3 py-3 text-right text-slate-300 tabular-nums">{r.sessions_7d || '—'}</td>
                    <td className={`px-3 py-3 text-right tabular-nums ${r.engaged_with_alert ? 'text-emerald-400' : 'text-slate-500'}`}>{r.engaged_with_alert ? '✓' : '—'}</td>
                    <td className="px-3 py-3 text-right text-slate-300 tabular-nums">{r.bookmarks || '—'}</td>
                    <td className="px-3 py-3 text-right text-slate-300 tabular-nums">{r.channels_configured || '—'}</td>
                    <td className={`px-3 py-3 text-right font-semibold tabular-nums ${scoreColor(score)}`}>{score}</td>
                  </tr>
                )
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">No users found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
