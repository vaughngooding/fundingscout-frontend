'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const router = useRouter()
  const searchParams = useSearchParams()
  const justUpgraded = searchParams.get('upgraded') === 'true'

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    amountMin: 0,
    amountMax: 500_000_000,
    fundingTypes: [],
    industries: [],
    country: 'all',
  })
  const [showUpgradeToast, setShowUpgradeToast] = useState(false)

  // Handle the post-Stripe-checkout redirect: clear the URL param and force
  // a fresh server fetch so the new plan status is reflected immediately.
  useEffect(() => {
    if (!justUpgraded) return
    setShowUpgradeToast(true)
    router.refresh()
    // Clean the URL so refresh doesn't re-trigger
    window.history.replaceState({}, '', '/dashboard')
    const t = setTimeout(() => setShowUpgradeToast(false), 7000)
    return () => clearTimeout(t)
  }, [justUpgraded, router])

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
        {/* Upgrade celebration toast — shown immediately after Stripe checkout redirect */}
        {showUpgradeToast && (
          <div className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-5 py-4 ring-1 ring-emerald-200">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-bold text-emerald-900">Welcome to Pro!</div>
                <div className="text-xs text-emerald-700">
                  Real-time alerts are now active. Verify your phone in Settings to start receiving SMS.
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowUpgradeToast(false)}
              className="text-emerald-600 hover:text-emerald-800 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Header row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950">Your alerts</h1>
              {plan === 'pro' && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                  Pro
                </span>
              )}
            </div>
            <p className="text-sm text-neutral-500 mt-1">
              {filteredAlerts.length} funding round{filteredAlerts.length !== 1 ? 's' : ''} matching your filters
            </p>
          </div>

          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400"
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
              className="w-full pl-10 pr-4 py-2.5 rounded-full border border-neutral-200 bg-white text-neutral-900 placeholder-neutral-400 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100 outline-none transition-colors text-sm"
            />
          </div>
        </div>

        {/* Upgrade banner — only for free users */}
        {showUpgradeBanner && (
          <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-neutral-50 to-emerald-50/60 p-5 ring-1 ring-emerald-100">
            <div>
              <h3 className="text-sm font-bold text-neutral-950">Upgrade to Pro for real-time alerts</h3>
              <p className="text-xs text-neutral-600 mt-0.5">
                You have {alerts.length} matching alerts. Pro delivers them in real time via SMS, Slack, Telegram, and more.
              </p>
            </div>
            <Link
              href="/settings"
              className="flex-shrink-0 rounded-full bg-emerald-600 px-4 py-2 text-white text-sm font-semibold transition-colors hover:bg-emerald-500"
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
          <div className="text-center py-20 rounded-3xl bg-neutral-50/60">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4">
              <svg
                className="w-8 h-8 text-neutral-400"
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
            <h3 className="text-lg font-bold text-neutral-950 mb-1">
              No alerts found
            </h3>
            <p className="text-sm text-neutral-600 max-w-sm mx-auto">
              {search || filters.dateRange !== 'all' || filters.fundingTypes.length > 0
                ? 'Try adjusting your search or filters to see more results.'
                : 'New funding alerts will appear here as they match your preferences. Check your settings to configure what you want to track.'}
            </p>
            {!search && filters.fundingTypes.length === 0 && (
              <Link
                href="/settings"
                className="inline-flex items-center gap-1.5 mt-5 rounded-full bg-neutral-900 px-5 py-2.5 text-white text-sm font-semibold transition-colors hover:bg-neutral-800"
              >
                Configure preferences
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
