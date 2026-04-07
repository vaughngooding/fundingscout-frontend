'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import AlertCard from '@/components/AlertCard'
import FilterSidebar, { type FilterState } from '@/components/FilterSidebar'
import type { UserAlert } from '@/lib/types'

interface DashboardClientProps {
  alerts: UserAlert[]
  plan: 'free' | 'pro'
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
    default:
      return true
  }
}

export default function DashboardClient({
  alerts,
  plan,
}: DashboardClientProps) {
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    amountMin: 0,
    amountMax: 500_000_000,
    fundingTypes: [],
    industries: [],
    country: 'all',
  })

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
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

      // Country
      if (
        filters.country !== 'all' &&
        round.location_country !== filters.country
      ) {
        return false
      }

      return true
    })
  }, [alerts, search, filters])

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
            <h1 className="text-2xl font-bold text-white">Your Alerts</h1>
            <p className="text-sm text-slate-400 mt-1">
              {filteredAlerts.length} funding round{filteredAlerts.length !== 1 ? 's' : ''} found
            </p>
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
