import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { FundingRound } from '@/lib/types'
import {
  formatAmount,
  formatRelativeTime,
  formatFundingType,
  countryFlag,
  fundingTypeBadgeColor,
  confidenceBadge,
} from '@/lib/utils'

export default async function CompanyPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const companyName = decodeURIComponent(slug).toLowerCase().trim()
  const supabase = await createClient()

  // Fetch all rounds for this company
  const { data: rounds } = await supabase
    .from('funding_rounds')
    .select('*')
    .ilike('company_name', companyName)
    .order('created_at', { ascending: false })

  if (!rounds || rounds.length === 0) {
    notFound()
  }

  const allRounds = rounds as FundingRound[]

  // Derive company info from best confidence row
  const bestRow = [...allRounds].sort(
    (a, b) => b.confidence_score - a.confidence_score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )[0]

  const totalRaised = allRounds.reduce((sum, r) => sum + r.amount_usd, 0)
  const bestConfidence = Math.max(...allRounds.map((r) => r.confidence_score))
  const badge = confidenceBadge(bestConfidence)

  // Aggregate investors and tags
  const allInvestors = [...new Set(allRounds.flatMap((r) => r.investors || []).filter(Boolean))]
  const allTags = [...new Set(allRounds.flatMap((r) => r.industry_tags || []).filter(Boolean))]

  return (
    <div>
      {/* Back link */}
      <Link
        href="/explore"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors mb-6"
      >
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Explore
      </Link>

      {/* Company Header */}
      <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-6 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-white">{bestRow.company_name}</h1>
              <div className="flex items-center gap-1.5">
                <svg className={`h-5 w-5 ${badge.color}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-1.065-1.686 3 3 0 01-4.468-2.598 3 3 0 00-1.74 0 3 3 0 01-4.468 2.598A3 3 0 003.597 7.35a3 3 0 010 5.304 3 3 0 001.065 1.684 3 3 0 014.468 2.598 3 3 0 001.74 0 3 3 0 014.468-2.598 3 3 0 001.065-1.686zM9.2 12.6a.75.75 0 001.1.025l3.5-3.25a.75.75 0 10-1.02-1.1l-2.96 2.747-1.027-.983a.75.75 0 10-1.036 1.084l1.443 1.477z" clipRule="evenodd" />
                </svg>
                <span className={`text-sm font-medium ${badge.color}`}>{badge.label}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-400">
              {bestRow.location && (
                <span>{countryFlag(bestRow.location_country)} {bestRow.location}</span>
              )}
              {bestRow.industry && (
                <span className="border-l border-slate-700 pl-3">{bestRow.industry}</span>
              )}
              {bestRow.website && (
                <a
                  href={bestRow.website.startsWith('http') ? bestRow.website : `https://${bestRow.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-l border-slate-700 pl-3 text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {bestRow.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              )}
            </div>

            {bestRow.company_description && (
              <p className="mt-3 text-sm text-slate-300 leading-relaxed max-w-2xl">
                {bestRow.company_description}
              </p>
            )}
          </div>

          <div className="flex gap-6 text-center flex-shrink-0">
            <div>
              <p className="text-2xl font-bold text-emerald-400">{formatAmount(totalRaised)}</p>
              <p className="text-xs text-slate-400 mt-0.5">Total Raised</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{allRounds.length}</p>
              <p className="text-xs text-slate-400 mt-0.5">Round{allRounds.length !== 1 ? 's' : ''}</p>
            </div>
            {bestRow.founded_year && (
              <div>
                <p className="text-2xl font-bold text-white">{bestRow.founded_year}</p>
                <p className="text-xs text-slate-400 mt-0.5">Founded</p>
              </div>
            )}
            {bestRow.employee_range && (
              <div>
                <p className="text-2xl font-bold text-white">{bestRow.employee_range}</p>
                <p className="text-xs text-slate-400 mt-0.5">Employees</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Funding History Table */}
      <div className="rounded-xl border border-slate-700/50 overflow-hidden mb-6">
        <div className="px-4 py-3 bg-slate-900 border-b border-slate-700/50">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Funding History</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-700/50 bg-slate-900/50">
            <tr>
              <th className="px-4 py-3 font-semibold text-slate-400">Date</th>
              <th className="px-4 py-3 font-semibold text-slate-400">Type</th>
              <th className="px-4 py-3 font-semibold text-slate-400">Amount</th>
              <th className="px-4 py-3 font-semibold text-slate-400 hidden sm:table-cell">Lead Investor</th>
              <th className="px-4 py-3 font-semibold text-slate-400 hidden md:table-cell">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {allRounds.map((round) => (
              <tr key={round.id} className="bg-slate-950 hover:bg-slate-900/80 transition-colors">
                <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                  {new Date(round.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${fundingTypeBadgeColor(round.funding_type)}`}>
                    {formatFundingType(round.funding_type)}
                  </span>
                </td>
                <td className="px-4 py-3 font-semibold text-emerald-400 whitespace-nowrap">
                  {formatAmount(round.amount_usd)}
                </td>
                <td className="px-4 py-3 text-slate-300 hidden sm:table-cell">
                  {round.lead_investor || <span className="text-slate-600">&mdash;</span>}
                </td>
                <td className="px-4 py-3 hidden md:table-cell">
                  <a
                    href={round.article_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors truncate block max-w-[200px]"
                    title={round.article_title || round.article_url}
                  >
                    {round.source_feed || 'Article'}
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Investors + Tags */}
      <div className="grid gap-6 sm:grid-cols-2">
        {allInvestors.length > 0 && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">All Investors</h2>
            <div className="flex flex-wrap gap-2">
              {allInvestors.map((inv) => (
                <span
                  key={inv}
                  className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-sm text-slate-300"
                >
                  {inv}
                </span>
              ))}
            </div>
          </div>
        )}

        {allTags.length > 0 && (
          <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-5">
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">Industry Tags</h2>
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-sm text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
