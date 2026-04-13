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

interface Props {
  agentRuns: AgentRun[]
  audits: AuditRow[]
  userFlags: UserFlag[]
}

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

// Expected max gap in minutes before we count it as downtime
const AGENT_EXPECTED_GAP: Record<string, number> = {
  scraper: 3,    // runs every 1 min, >3 min = downtime
  webhooks: 5,   // triggered per scraper run, >5 min = gap
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

function formatAmount(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(0)}M`
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(0)}K`
  return `$${usd}`
}

function formatMinutes(min: number): string {
  if (min < 60) return `${min.toFixed(0)}m`
  if (min < 1440) return `${(min / 60).toFixed(1)}h`
  return `${(min / 1440).toFixed(1)}d`
}

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

    // Sort oldest first
    const sorted = [...agentRuns].sort((a, b) => new Date(a.run_at).getTime() - new Date(b.run_at).getTime())

    let onTime = 0
    let totalDowntime = 0
    let longestGap = 0

    for (let i = 1; i < sorted.length; i++) {
      const gap = (new Date(sorted[i].run_at).getTime() - new Date(sorted[i - 1].run_at).getTime()) / 60000
      if (gap <= maxGap) {
        onTime++
      } else {
        const downtime = gap - maxGap
        totalDowntime += downtime
        if (gap > longestGap) longestGap = gap
      }
    }
    // First run is always "on time"
    onTime++

    const total = sorted.length
    const uptimePct = total > 0 ? (onTime / total) * 100 : 100

    results.push({ agent, totalRuns: total, onTimeRuns: onTime, uptimePct, totalDowntimeMin: totalDowntime, longestGapMin: longestGap })
  }

  return results.sort((a, b) => a.uptimePct - b.uptimePct)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QualityClient({ agentRuns, audits, userFlags }: Props) {
  const [runsExpanded, setRunsExpanded] = useState(false)
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null)

  const visibleRuns = runsExpanded ? agentRuns : agentRuns.slice(0, 5)
  const uptimeStats = useMemo(() => computeUptime(agentRuns), [agentRuns])

  return (
    <div className="space-y-6">
      {/* ----------------------------------------------------------------- */}
      {/* 1. Recent Audit Results (Expandable Rows) — FIRST */}
      {/* ----------------------------------------------------------------- */}
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-700/50">
          <h2 className="text-base font-semibold text-white">Recent Audit Results</h2>
          <p className="text-xs text-slate-400">Click a row to see full reasoning and field details</p>
        </div>
        <div className="divide-y divide-slate-800/50">
          {audits.slice(0, 30).map((audit) => {
            const isExpanded = expandedAudit === audit.id
            const verdicts = parseJsonField<Record<string, string>>(audit.field_verdicts)
            const notes = parseJsonField<Record<string, string>>(audit.field_notes)

            return (
              <div key={audit.id}>
                {/* Row header */}
                <button
                  onClick={() => setExpandedAudit(isExpanded ? null : audit.id)}
                  className="w-full text-left px-4 py-3 hover:bg-slate-800/30 transition-colors flex items-center gap-4"
                >
                  <div className="w-[200px] flex-shrink-0">
                    <div className="text-sm text-white font-medium truncate">
                      {audit.funding_round?.company_name || '—'}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {audit.funding_round
                        ? `${formatAmount(audit.funding_round.amount_usd)} ${audit.funding_round.funding_type}`
                        : ''}
                    </div>
                  </div>

                  <div className="w-[120px] flex-shrink-0 text-xs text-slate-400 truncate">
                    {audit.funding_round?.source_feed || '—'}
                  </div>

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

                  <div className="flex-1 min-w-0 text-xs text-slate-400 truncate">
                    {audit.classification_reasoning || '—'}
                  </div>

                  <svg
                    className={`w-4 h-4 text-slate-500 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                  <div className="px-4 pb-4 bg-slate-800/20 border-t border-slate-800/50">
                    <div className="mt-3">
                      <div className="text-xs font-medium text-slate-400 mb-1">Classification Reasoning</div>
                      <p className="text-sm text-slate-200 leading-relaxed">
                        {audit.classification_reasoning || 'No reasoning provided'}
                      </p>
                    </div>

                    {verdicts && (
                      <div className="mt-4">
                        <div className="text-xs font-medium text-slate-400 mb-2">Field-Level Accuracy</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {Object.entries(verdicts).map(([field, verdict]) => {
                            const note = notes?.[field]
                            return (
                              <div
                                key={field}
                                className={`rounded-lg px-3 py-2 border ${
                                  verdict === 'CORRECT' ? 'border-emerald-500/20 bg-emerald-500/5' :
                                  verdict === 'INCORRECT' ? 'border-red-500/20 bg-red-500/5' :
                                  'border-slate-700/50 bg-slate-800/30'
                                }`}
                              >
                                <div className="text-[11px] text-slate-400 font-medium">
                                  {FIELD_LABELS[field] || field}
                                </div>
                                <div className={`text-xs font-semibold mt-0.5 ${verdictColor(verdict)}`}>
                                  {verdictLabel(verdict)}
                                </div>
                                {note && (
                                  <div className="text-[11px] text-slate-400 mt-1 leading-snug">
                                    {note}
                                  </div>
                                )}
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
            <div className="px-4 py-8 text-center text-slate-500 text-sm">
              No audit data yet. Run the watchdog to see results.
            </div>
          )}
        </div>
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 2. Agent Runs (Collapsible) with Uptime Stats — SECOND */}
      {/* ----------------------------------------------------------------- */}
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
        <button
          onClick={() => setRunsExpanded(!runsExpanded)}
          className="w-full px-4 py-3 border-b border-slate-700/50 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
        >
          <div className="text-left">
            <h2 className="text-base font-semibold text-white">Agent Runs</h2>
            <p className="text-xs text-slate-400">
              Central heartbeat log — {agentRuns.length} runs
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {runsExpanded ? 'Showing all' : `Showing ${visibleRuns.length} of ${agentRuns.length}`}
            </span>
            <svg
              className={`w-4 h-4 text-slate-400 transition-transform ${runsExpanded ? 'rotate-180' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>

        {/* Uptime Stats Bar */}
        {uptimeStats.length > 0 && (
          <div className="px-4 py-3 border-b border-slate-800/50 bg-slate-800/20">
            <div className="text-xs font-medium text-slate-400 mb-2">Agent Uptime</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {uptimeStats.map((s) => (
                <div key={s.agent} className="flex items-center gap-3">
                  <span className={agentBadge(s.agent)}>{s.agent}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <div className="flex-1 h-1.5 rounded-full overflow-hidden bg-slate-700">
                        <div
                          className={`h-full rounded-full transition-all ${
                            s.uptimePct >= 95 ? 'bg-emerald-500' :
                            s.uptimePct >= 80 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${s.uptimePct}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold tabular-nums ${
                        s.uptimePct >= 95 ? 'text-emerald-400' :
                        s.uptimePct >= 80 ? 'text-amber-400' : 'text-red-400'
                      }`}>
                        {s.uptimePct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex gap-2 text-[10px] text-slate-500">
                      <span>{s.onTimeRuns}/{s.totalRuns} on time</span>
                      {s.totalDowntimeMin > 0 && (
                        <span className="text-red-400/70">{formatMinutes(s.totalDowntimeMin)} downtime</span>
                      )}
                      {s.longestGapMin > 0 && (
                        <span className="text-slate-600">longest gap: {formatMinutes(s.longestGapMin)}</span>
                      )}
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
              {visibleRuns.map((run) => (
                <tr key={run.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                  <td className="px-4 py-2">
                    <span className={agentBadge(run.agent)}>{run.agent}</span>
                  </td>
                  <td className="px-4 py-2 text-slate-400 whitespace-nowrap">{timeAgo(run.run_at)}</td>
                  <td className="px-4 py-2 text-slate-500">{run.domain || '—'}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={run.items > 0 ? 'text-emerald-400 font-medium' : 'text-slate-500'}>
                      {run.items}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <span className={run.errors > 0 ? 'text-red-400 font-medium' : 'text-slate-500'}>
                      {run.errors}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-right text-slate-400">{formatDuration(run.duration_ms)}</td>
                  <td className="px-4 py-2 text-slate-400 max-w-xs truncate text-xs">
                    {run.learnings || '—'}
                  </td>
                </tr>
              ))}
              {agentRuns.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No agent runs logged yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!runsExpanded && agentRuns.length > 5 && (
          <button
            onClick={() => setRunsExpanded(true)}
            className="w-full py-2 text-xs text-slate-400 hover:text-white hover:bg-slate-800/30 transition-colors border-t border-slate-800/50"
          >
            Show {agentRuns.length - 5} more runs
          </button>
        )}
      </section>

      {/* ----------------------------------------------------------------- */}
      {/* 3. User Flags */}
      {/* ----------------------------------------------------------------- */}
      {userFlags.length > 0 && (
        <section className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-700/50">
            <h2 className="text-base font-semibold text-white">User Flags</h2>
            <p className="text-xs text-slate-400">Ground truth feedback from users</p>
          </div>
          <div className="divide-y divide-slate-800/50">
            {userFlags.map((flag) => (
              <div key={flag.id} className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm text-white">
                  {flag.funding_round?.company_name || '—'}
                </span>
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
    </div>
  )
}
