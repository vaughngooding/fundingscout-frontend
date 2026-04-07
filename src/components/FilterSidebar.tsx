'use client'

import { useState } from 'react'

export interface FilterState {
  dateRange: 'today' | 'week' | 'month' | 'all'
  amountMin: number
  amountMax: number
  fundingTypes: string[]
  industries: string[]
  country: string
}

const FUNDING_TYPES = [
  'pre-seed',
  'seed',
  'series-a',
  'series-b',
  'series-c',
  'series-d',
]

const INDUSTRIES = [
  'AI/ML',
  'SaaS',
  'FinTech',
  'HealthTech',
  'Climate',
  'B2B',
  'B2C',
  'EdTech',
  'Security',
  'Data',
]

const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'all', label: 'All Time' },
] as const

function formatFundingType(type: string): string {
  return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatAmountLabel(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

interface FilterSidebarProps {
  onFilterChange: (filters: FilterState) => void
}

export default function FilterSidebar({ onFilterChange }: FilterSidebarProps) {
  const [open, setOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    amountMin: 0,
    amountMax: 500_000_000,
    fundingTypes: [],
    industries: [],
    country: 'all',
  })

  function updateFilters(partial: Partial<FilterState>) {
    const updated = { ...filters, ...partial }
    setFilters(updated)
    onFilterChange(updated)
  }

  function toggleArrayItem(key: 'fundingTypes' | 'industries', item: string) {
    const current = filters[key]
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item]
    updateFilters({ [key]: updated })
  }

  function clearAll() {
    const cleared: FilterState = {
      dateRange: 'all',
      amountMin: 0,
      amountMax: 500_000_000,
      fundingTypes: [],
      industries: [],
      country: 'all',
    }
    setFilters(cleared)
    onFilterChange(cleared)
  }

  const hasActiveFilters =
    filters.dateRange !== 'all' ||
    filters.amountMin > 0 ||
    filters.amountMax < 500_000_000 ||
    filters.fundingTypes.length > 0 ||
    filters.industries.length > 0 ||
    filters.country !== 'all'

  const sidebarContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-neutral-500">
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Date Range */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Date Range
        </h3>
        <div className="flex flex-wrap gap-2">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilters({ dateRange: opt.value })}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filters.dateRange === opt.value
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Range */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Amount Range
        </h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">
              Min: {formatAmountLabel(filters.amountMin)}
            </label>
            <input
              type="range"
              min={0}
              max={500_000_000}
              step={1_000_000}
              value={filters.amountMin}
              onChange={(e) =>
                updateFilters({ amountMin: Number(e.target.value) })
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-emerald-600"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-500">
              Max: {formatAmountLabel(filters.amountMax)}
            </label>
            <input
              type="range"
              min={0}
              max={500_000_000}
              step={1_000_000}
              value={filters.amountMax}
              onChange={(e) =>
                updateFilters({ amountMax: Number(e.target.value) })
              }
              className="h-1.5 w-full cursor-pointer appearance-none rounded-lg bg-neutral-200 accent-emerald-600"
            />
          </div>
        </div>
      </div>

      {/* Funding Type */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Funding Type
        </h3>
        <div className="space-y-1.5">
          {FUNDING_TYPES.map((type) => (
            <label
              key={type}
              className="flex items-center gap-2 cursor-pointer group/check"
            >
              <input
                type="checkbox"
                checked={filters.fundingTypes.includes(type)}
                onChange={() => toggleArrayItem('fundingTypes', type)}
                className="h-4 w-4 cursor-pointer rounded border-neutral-300 bg-white text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <span className="text-sm text-neutral-700 transition-colors group-hover/check:text-neutral-950">
                {formatFundingType(type)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Industry */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Industry
        </h3>
        <div className="space-y-1.5">
          {INDUSTRIES.map((industry) => (
            <label
              key={industry}
              className="flex items-center gap-2 cursor-pointer group/check"
            >
              <input
                type="checkbox"
                checked={filters.industries.includes(industry)}
                onChange={() => toggleArrayItem('industries', industry)}
                className="h-4 w-4 cursor-pointer rounded border-neutral-300 bg-white text-emerald-600 focus:ring-emerald-500 focus:ring-offset-0"
              />
              <span className="text-sm text-neutral-700 transition-colors group-hover/check:text-neutral-950">
                {industry}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Country */}
      <div>
        <h3 className="text-xs font-semibold text-neutral-500 uppercase tracking-wider mb-3">
          Country
        </h3>
        <select
          value={filters.country}
          onChange={(e) => updateFilters({ country: e.target.value })}
          className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-800 outline-none transition-colors focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
        >
          <option value="all">All Countries</option>
          <option value="US">United States</option>
          <option value="CA">Canada</option>
          <option value="GB">United Kingdom</option>
          <option value="DE">Germany</option>
          <option value="FR">France</option>
          <option value="IL">Israel</option>
          <option value="IN">India</option>
          <option value="AU">Australia</option>
          <option value="SG">Singapore</option>
        </select>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-40 rounded-full bg-emerald-600 p-3 text-white shadow-lg shadow-emerald-600/30 transition-colors hover:bg-emerald-500 lg:hidden"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
          />
        </svg>
      </button>

      {/* Mobile overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed right-0 top-0 z-50 h-full w-80 flex-shrink-0 overflow-y-auto
          border-l border-neutral-200 bg-white p-6
          transition-transform duration-300
          lg:sticky lg:right-auto lg:top-0 lg:z-auto lg:h-auto lg:w-64
          lg:border-l-0 lg:bg-transparent lg:transition-none
          ${open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setOpen(false)}
          className="absolute right-4 top-4 text-neutral-400 transition-colors hover:text-neutral-700 lg:hidden"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {sidebarContent}
      </aside>
    </>
  )
}
