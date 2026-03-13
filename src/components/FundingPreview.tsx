import Link from 'next/link'
import { createServerClient } from '@supabase/ssr'
import {
  formatAmount,
  formatRelativeTime,
  formatFundingType,
  countryFlag,
  fundingTypeBadgeColor,
  confidenceBadge,
} from '@/lib/utils'
import type { FundingRound, ExploreStats } from '@/lib/types'

export default async function FundingPreview() {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  )

  // Fetch stats
  const { data: statsData } = await supabase.rpc('get_explore_stats')
  const stats: ExploreStats | null = statsData as ExploreStats | null

  // Fetch 10 most recent rounds
  const { data: rounds } = await supabase
    .from('funding_rounds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  const recentRounds = (rounds || []) as FundingRound[]

  if (recentRounds.length === 0) return null

  return (
    <section className="border-t border-slate-800 px-6 py-24">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
            Live Data
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Live Funding Activity
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Real funding rounds detected by our AI pipeline &mdash; updated every 5 minutes.
          </p>
        </div>

        {/* Stats bar */}
        {stats && (
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.total_rounds.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-400">Rounds (90d)</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
              <p className="text-2xl font-bold text-emerald-400">{formatAmount(stats.total_capital)}</p>
              <p className="mt-1 text-xs text-slate-400">Total Capital</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
              <p className="text-2xl font-bold text-white">{formatAmount(stats.avg_round_size)}</p>
              <p className="mt-1 text-xs text-slate-400">Avg Round</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
              <p className="text-2xl font-bold text-white">{stats.unique_companies.toLocaleString()}</p>
              <p className="mt-1 text-xs text-slate-400">Companies</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="mt-10 overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 bg-slate-900">
              <tr>
                <th className="px-4 py-3 font-semibold text-slate-400">Company</th>
                <th className="px-4 py-3 font-semibold text-slate-400">Amount</th>
                <th className="px-4 py-3 font-semibold text-slate-400 hidden sm:table-cell">Type</th>
                <th className="px-4 py-3 font-semibold text-slate-400 hidden md:table-cell">Lead Investor</th>
                <th className="px-4 py-3 font-semibold text-slate-400 hidden lg:table-cell">Location</th>
                <th className="px-4 py-3 font-semibold text-slate-400 text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {recentRounds.map((round) => {
                const badge = confidenceBadge(round.confidence_score)
                return (
                  <tr key={round.id} className="bg-slate-950 transition-colors hover:bg-slate-900/80">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-white">{round.company_name}</span>
                        {round.confidence_score >= 80 && (
                          <svg className={`h-4 w-4 flex-shrink-0 ${badge.color}`} fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-1.065-1.686 3 3 0 01-4.468-2.598 3 3 0 00-1.74 0 3 3 0 01-4.468 2.598A3 3 0 003.597 7.35a3 3 0 010 5.304 3 3 0 001.065 1.684 3 3 0 014.468 2.598 3 3 0 001.74 0 3 3 0 014.468-2.598 3 3 0 001.065-1.686zM9.2 12.6a.75.75 0 001.1.025l3.5-3.25a.75.75 0 10-1.02-1.1l-2.96 2.747-1.027-.983a.75.75 0 10-1.036 1.084l1.443 1.477z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-emerald-400">
                      {formatAmount(round.amount_usd)}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${fundingTypeBadgeColor(round.funding_type)}`}>
                        {formatFundingType(round.funding_type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 hidden md:table-cell">
                      {round.lead_investor || <span className="text-slate-600">&mdash;</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden lg:table-cell">
                      {round.location ? (
                        <span>{countryFlag(round.location_country)} {round.location}</span>
                      ) : (
                        <span className="text-slate-600">&mdash;</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatRelativeTime(round.created_at)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/25"
          >
            Sign up to explore all {stats ? stats.total_rounds.toLocaleString() : ''} rounds
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}
