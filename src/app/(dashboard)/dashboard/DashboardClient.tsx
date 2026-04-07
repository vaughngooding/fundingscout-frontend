'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import AlertCard from '@/components/AlertCard'
import FilterSidebar, { type FilterState } from '@/components/FilterSidebar'
import type { UserAlert, FundingRound } from '@/lib/types'

type ViewMode = 'matches' | 'all'

interface DashboardClientProps {
  alerts: UserAlert[]
  allRounds: FundingRound[]
  plan: 'free' | 'pro'
}

// Wrap a raw FundingRound as a synthetic UserAlert so the rest of the
// rendering pipeline (filters, AlertCard) can stay uniform between modes.
function roundToSyntheticAlert(round: FundingRound): UserAlert {
  return {
    id: `synthetic-${round.id}`,
    user_id: '',
    funding_round_id: round.id,
    funding_round: round,
    status: 'sent',
    is_bookmarked: false,
    notes: null,
    email_sent_at: null,
    read_at: null,
    created_at: round.created_at,
  }
}

function isWithinDateRange(
  dateStr: string,
  range: FilterState['dateRange']
): boolean {
  if (range === 'all') return true
  const date = new Date(dateStr)
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (range) {
    case 'today':
      return date >= startOfToday
    case 'week': {
      const weekAgo = new Date(startOfToday)
      weekAgo.setDate(weekAgo.getDate() - 7)
      return date >= weekAgo
    }
    case 'month': {
      const monthAgo = new Date(startOfToday)
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return date >= monthAgo
    }
    case 'quarter': {
      const ninetyDaysAgo = new Date(startOfToday)
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)
      return date >= ninetyDaysAgo
    }
    default:
      return true
  }
}

export default function DashboardClient({
  alerts,
  allRounds,
  plan,
}: DashboardClientProps) {
  const [search, setSearch] = useState('')
  // 'matches' = user_alerts (default, pre-filtered by saved preferences)
  // 'all'     = every recent funding round (firehose, replaces /explore)
  const [viewMode, setViewMode] = useState<ViewMode>('matches')
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    amountMin: 0,
    amountMax: 500_000_000,
    fundingTypes: [],
    industries: [],
    countries: [],
  })

  // The active dataset depends on the view mode. Rounds in 'all' mode are
  // wrapped as synthetic alerts so the same filter + render pipeline works.
  const activeAlerts = useMemo(
    () => (viewMode === 'matches' ? alerts : allRounds.map(roundToSyntheticAlert)),
    [viewMode, alerts, allRounds],
  )

  const filteredAlerts = useMemo(() => {
    return activeAlerts.filter((alert) => {
      const round = alert.funding_round
      if (!round) return false

      // Search by company name
      if (
        search &&
        !round.company_name.toLowerCase().includes(search.toLowerCase())
      ) {
        return false
      }

      // Date range
      if (!isWithinDateRange(alert.created_at, filters.dateRange)) {
        return false
      }

      // Amount range
      if (
        round.amount_usd < filters.amountMin ||
        round.amount_usd > filters.amountMax
      ) {
        return false
      }

      // Funding type
      if (
        filters.fundingTypes.length > 0 &&
        !filters.fundingTypes.includes(round.funding_type)
      ) {
        return false
      }

      // Industries
      if (filters.industries.length > 0) {
        const hasMatch = round.industry_tags?.some((tag) =>
          filters.industries.includes(tag)
        )
        if (!hasMatch) return false
      }

      // Countries (multi-select — empty array = no filter)
      if (
        filters.countries.length > 0 &&
        !filters.countries.includes(round.location_country || '')
      ) {
        return false
      }

      return true
    })
  }, [activeAlerts, search, filters])

  const showUpgradeBanner = plan === 'free' && alerts.length > 3

  return (
    <div className="flex gap-6">
      {/* Sidebar */}
      <FilterSidebar onFilterChange={setFilters} />

      {/* Main content */}
      <div className="flex-1 min-w-0">
        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">
              {filteredAlerts.length} funding round{filteredAlerts.length !== 1 ? 's' : ''}
              {viewMode === 'matches' ? ' matching your alert settings' : ' in the database'}
            </p>
          </div>

          {/* Matches / All toggle */}
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 p-1 ring-1 ring-slate-700">
            <button
              type="button"
              onClick={() => setViewMode('matches')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'matches'
                  ? 'bg-emerald-600 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              My matches
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold transition-all ${
                viewMode === 'all'
                  ? 'bg-emerald-600 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All rounds
            </button>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              type="text"
              placeholder="Search by company name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-700 bg-slate-900 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-sm"
            />
          </div>
        </div>

        {/* Upgrade banner */}
        {showUpgradeBanner && (
          <div className="mb-6 bg-gradient-to-r from-blue-600/20 to-emerald-600/20 border border-blue-500/30 rounded-xl p-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">
                Upgrade to Pro
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                You have {alerts.length} alerts. Free plan is limited. Unlock
                unlimited alerts, bookmarks, and Slack/Teams integrations.
              </p>
            </div>
            <Link
              href="/settings"
              className="flex-shrink-0 ml-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Upgrade
            </Link>
          </div>
        )}

        {/* Alert feed */}
        {filteredAlerts.length > 0 ? (
          <div className="grid gap-4">
            {filteredAlerts.map((alert) => (
              <AlertCard key={alert.id} alert={alert} />
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
              <svg
                className="w-8 h-8 text-slate-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-1">
              No alerts found
            </h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              {search || filters.dateRange !== 'all' || filters.fundingTypes.length > 0
                ? 'Try adjusting your search or filters to see more results.'
                : 'New funding alerts will appear here as they match your preferences. Check your settings to configure what you want to track.'}
            </p>
            {!search && filters.fundingTypes.length === 0 && (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
              >
                Configure Preferences
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
