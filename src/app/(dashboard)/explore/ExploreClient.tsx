'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import FilterSidebar, { type FilterState } from '@/components/FilterSidebar'
import type { FundingRound, ExploreStats } from '@/lib/types'
import {
  formatAmount,
  formatRelativeTime,
  formatFundingType,
  countryFlag,
  fundingTypeBadgeColor,
  confidenceBadge,
} from '@/lib/utils'

interface ExploreClientProps {
  rounds: FundingRound[]
  stats: ExploreStats | null
  totalCount: number
  totalPages: number
  currentPage: number
  initialSearch: string
  initialSort: string
  initialFilters: FilterState
}

const SORT_OPTIONS = [
  { value: 'date', label: 'Most Recent' },
  { value: 'amount_desc', label: 'Amount (High to Low)' },
  { value: 'amount_asc', label: 'Amount (Low to High)' },
  { value: 'company', label: 'Company A-Z' },
]

export default function ExploreClient({
  rounds,
  stats,
  totalCount,
  totalPages,
  currentPage,
  initialSearch,
  initialSort,
  initialFilters,
}: ExploreClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState(initialSearch)
  const [sort, setSort] = useState(initialSort)
  const [debounceTimer, setDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

  // Build URL with updated params and navigate
  const navigate = useCallback(
    (overrides: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, val] of Object.entries(overrides)) {
        if (val && val !== '' && val !== 'all' && val !== '0') {
          params.set(key, val)
        } else {
          params.delete(key)
        }
      }
      // Reset to page 1 on filter/search/sort change unless explicitly set
      if (!('page' in overrides)) {
        params.delete('page')
      }
      startTransition(() => {
        router.push(`/explore?${params.toString()}`)
      })
    },
    [router, searchParams, startTransition]
  )

  function handleSearch(value: string) {
    setSearch(value)
    if (debounceTimer) clearTimeout(debounceTimer)
    const timer = setTimeout(() => {
      navigate({ search: value || undefined })
    }, 300)
    setDebounceTimer(timer)
  }

  function handleSort(value: string) {
    setSort(value)
    navigate({ sort: value === 'date' ? undefined : value })
  }

  function handleFilterChange(filters: FilterState) {
    navigate({
      dateRange: filters.dateRange === 'all' ? undefined : filters.dateRange,
      amountMin: filters.amountMin > 0 ? String(filters.amountMin) : undefined,
      amountMax: filters.amountMax < 500_000_000 ? String(filters.amountMax) : undefined,
      types: filters.fundingTypes.length > 0 ? filters.fundingTypes.join(',') : undefined,
      industries: filters.industries.length > 0 ? filters.industries.join(',') : undefined,
      // countries is a comma-separated list (handled server-side as IN clause)
      countries: filters.countries.length > 0 ? filters.countries.join(',') : undefined,
    })
  }

  function handlePage(page: number) {
    navigate({ page: page > 1 ? String(page) : undefined })
  }

  // Build page number array
  function getPageNumbers(): (number | '...')[] {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1)
    }
    const pages: (number | '...')[] = [1]
    if (currentPage > 3) pages.push('...')
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i)
    }
    if (currentPage < totalPages - 2) pages.push('...')
    pages.push(totalPages)
    return pages
  }

  return (
    <div>
      {/* Stats Bar */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-6">
          <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.total_rounds.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-400">Total Rounds</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{formatAmount(stats.total_capital)}</p>
            <p className="mt-1 text-xs text-slate-400">Total Capital</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-4 text-center">
            <p className="text-2xl font-bold text-white">{formatAmount(stats.avg_round_size)}</p>
            <p className="mt-1 text-xs text-slate-400">Avg Round</p>
          </div>
          <div className="rounded-xl border border-slate-700/50 bg-slate-900 p-4 text-center">
            <p className="text-2xl font-bold text-white">{stats.unique_companies.toLocaleString()}</p>
            <p className="mt-1 text-xs text-slate-400">Companies</p>
          </div>
        </div>
      )}

      {/* Search + Sort Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Explore Funding Rounds</h1>
          <p className="text-sm text-slate-400 mt-1">
            {totalCount.toLocaleString()} round{totalCount !== 1 ? 's' : ''} found
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative w-full sm:w-72">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search companies..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-sm"
            />
          </div>
          {/* Sort */}
          <select
            value={sort}
            onChange={(e) => handleSort(e.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2.5 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main content with sidebar */}
      <div className="flex gap-6">
        <FilterSidebar onFilterChange={handleFilterChange} />

        <div className="flex-1 min-w-0">
          {/* Loading overlay */}
          {isPending && (
            <div className="mb-4 flex items-center gap-2 text-sm text-blue-400">
              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading...
            </div>
          )}

          {/* Table */}
          {rounds.length > 0 ? (
            <div className="overflow-x-auto rounded-xl border border-slate-700/50">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-700/50 bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-400">Company</th>
                    <th className="px-4 py-3 font-semibold text-slate-400">Amount</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 hidden sm:table-cell">Type</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 hidden md:table-cell">Lead Investor</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 hidden lg:table-cell">Location</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 hidden lg:table-cell">Confidence</th>
                    <th className="px-4 py-3 font-semibold text-slate-400 text-right">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {rounds.map((round) => {
                    const badge = confidenceBadge(round.confidence_score)
                    const slug = encodeURIComponent(round.company_name.trim().toLowerCase())
                    return (
                      <tr key={round.id} className="bg-slate-950 transition-colors hover:bg-slate-900/80">
                        <td className="px-4 py-3">
                          <Link
                            href={`/company/${slug}`}
                            className="flex items-center gap-2 group"
                          >
                            <span className="font-medium text-white group-hover:text-blue-400 transition-colors">
                              {round.company_name}
                            </span>
                            {round.confidence_score >= 80 && (
                              <svg className="h-4 w-4 flex-shrink-0 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.403 12.652a3 3 0 010-5.304 3 3 0 00-1.065-1.686 3 3 0 01-4.468-2.598 3 3 0 00-1.74 0 3 3 0 01-4.468 2.598A3 3 0 003.597 7.35a3 3 0 010 5.304 3 3 0 001.065 1.684 3 3 0 014.468 2.598 3 3 0 001.74 0 3 3 0 014.468-2.598 3 3 0 001.065-1.686zM9.2 12.6a.75.75 0 001.1.025l3.5-3.25a.75.75 0 10-1.02-1.1l-2.96 2.747-1.027-.983a.75.75 0 10-1.036 1.084l1.443 1.477z" clipRule="evenodd" />
                              </svg>
                            )}
                          </Link>
                          {/* Industry tags on mobile */}
                          {round.industry_tags && round.industry_tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1 sm:hidden">
                              {round.industry_tags.slice(0, 2).map((tag) => (
                                <span key={tag} className="text-xs text-slate-500">{tag}</span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 font-semibold text-emerald-400 whitespace-nowrap">
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
                        <td className="px-4 py-3 text-slate-400 hidden lg:table-cell whitespace-nowrap">
                          {round.location ? (
                            <span>{countryFlag(round.location_country)} {round.location}</span>
                          ) : (
                            <span className="text-slate-600">&mdash;</span>
                          )}
                        </td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <div className="flex items-center gap-1.5">
                            <svg className={`h-4 w-4 ${badge.color}`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 1a4.5 4.5 0 00-4.5 4.5V9H5a2 2 0 00-2 2v6a2 2 0 002 2h10a2 2 0 002-2v-6a2 2 0 00-2-2h-.5V5.5A4.5 4.5 0 0010 1zm3 8V5.5a3 3 0 10-6 0V9h6z" clipRule="evenodd" />
                            </svg>
                            <span className={`text-xs font-medium ${badge.color}`}>{badge.label}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right text-slate-500 whitespace-nowrap">
                          {formatRelativeTime(round.created_at)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
                <svg className="w-8 h-8 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-1">No rounds found</h3>
              <p className="text-sm text-slate-400">Try adjusting your search or filters.</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 mt-6">
              <button
                onClick={() => handlePage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                &laquo; Prev
              </button>
              {getPageNumbers().map((p, i) =>
                p === '...' ? (
                  <span key={`dots-${i}`} className="px-2 py-2 text-slate-600">...</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => handlePage(p)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      p === currentPage
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
              <button
                onClick={() => handlePage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-3 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next &raquo;
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
