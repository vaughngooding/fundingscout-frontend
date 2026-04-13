'use client'

import { useEffect, useRef, useState } from 'react'

export interface FilterState {
  dateRange: 'today' | 'week' | 'month' | 'quarter' | 'all'
  amountMin: number
  amountMax: number
  fundingTypes: string[]
  industries: string[]
  countries: string[]
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

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'IL', label: 'Israel' },
  { value: 'IN', label: 'India' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AU', label: 'Australia' },
  { value: 'BR', label: 'Brazil' },
]

const DATE_OPTIONS = [
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Last 7 days' },
  { value: 'month', label: 'Last 30 days' },
  { value: 'quarter', label: 'Last 90 days' },
  { value: 'all', label: 'All Time' },
] as const

function formatFundingType(type: string): string {
  return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// Parse human-friendly amount input into a number.
//
// Funding alerts are denominated in millions of dollars by default — typing
// "10" means $10M, not literally $10. Users explicitly add a 'k' suffix
// when they mean thousands. Suffixes still work for users who want to be
// explicit (5m, $2.5M, 500k, 1.5b).
function parseAmount(input: string): number | null {
  const cleaned = input.trim().replace(/[$,\s]/g, '').toLowerCase()
  if (!cleaned) return null
  const match = cleaned.match(/^(\d+\.?\d*)([kmb])?$/)
  if (!match) return null
  const num = parseFloat(match[1])
  if (isNaN(num)) return null
  const suffix = match[2]
  if (suffix === 'k') return Math.round(num * 1_000)
  if (suffix === 'm') return Math.round(num * 1_000_000)
  if (suffix === 'b') return Math.round(num * 1_000_000_000)
  // Bare number → assume millions. Funding rounds in the single dollars
  // don't exist, so this is the right default for the funding domain.
  return Math.round(num * 1_000_000)
}

function formatAmountForInput(value: number): string {
  if (value === 0) return ''
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
    countries: [],
  })
  // Local string state for amount inputs. The numeric filter is debounced
  // off these so users see results update as they type without needing to
  // blur or hit Enter — but a 350ms pause prevents flicker mid-typing.
  const [minAmountInput, setMinAmountInput] = useState('')
  const [maxAmountInput, setMaxAmountInput] = useState('')
  const minDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const maxDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function updateFilters(partial: Partial<FilterState>) {
    const updated = { ...filters, ...partial }
    setFilters(updated)
    onFilterChange(updated)
  }

  function toggleArrayItem(key: 'fundingTypes' | 'industries' | 'countries', item: string) {
    const current = filters[key]
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item]
    updateFilters({ [key]: updated })
  }

  // Auto-apply min as user types (debounced 350ms). Empty input → 0.
  useEffect(() => {
    if (minDebounceRef.current) clearTimeout(minDebounceRef.current)
    minDebounceRef.current = setTimeout(() => {
      const trimmed = minAmountInput.trim()
      if (trimmed === '') {
        if (filters.amountMin !== 0) updateFilters({ amountMin: 0 })
        return
      }
      const parsed = parseAmount(trimmed)
      if (parsed !== null && parsed !== filters.amountMin) {
        updateFilters({ amountMin: parsed })
      }
    }, 350)
    return () => {
      if (minDebounceRef.current) clearTimeout(minDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minAmountInput])

  // Auto-apply max as user types (debounced 350ms). Empty input → 500M.
  useEffect(() => {
    if (maxDebounceRef.current) clearTimeout(maxDebounceRef.current)
    maxDebounceRef.current = setTimeout(() => {
      const trimmed = maxAmountInput.trim()
      if (trimmed === '') {
        if (filters.amountMax !== 500_000_000) updateFilters({ amountMax: 500_000_000 })
        return
      }
      const parsed = parseAmount(trimmed)
      if (parsed !== null && parsed !== filters.amountMax) {
        updateFilters({ amountMax: parsed })
      }
    }, 350)
    return () => {
      if (maxDebounceRef.current) clearTimeout(maxDebounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxAmountInput])

  // Reformat the input on blur so "4m" becomes "$4M" — purely cosmetic,
  // the filter has already applied via the debounce above.
  function formatMinOnBlur() {
    const parsed = parseAmount(minAmountInput)
    if (parsed !== null) setMinAmountInput(formatAmountForInput(parsed))
  }

  function formatMaxOnBlur() {
    const parsed = parseAmount(maxAmountInput)
    if (parsed !== null) setMaxAmountInput(formatAmountForInput(parsed))
  }

  function clearAll() {
    const cleared: FilterState = {
      dateRange: 'all',
      amountMin: 0,
      amountMax: 500_000_000,
      fundingTypes: [],
      industries: [],
      countries: [],
    }
    setFilters(cleared)
    setMinAmountInput('')
    setMaxAmountInput('')
    onFilterChange(cleared)
  }

  const hasActiveFilters =
    filters.dateRange !== 'all' ||
    filters.amountMin > 0 ||
    filters.amountMax < 500_000_000 ||
    filters.fundingTypes.length > 0 ||
    filters.industries.length > 0 ||
    filters.countries.length > 0

  const sidebarContent = (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
          Filters
        </h2>
        {hasActiveFilters && (
          <button
            onClick={clearAll}
            className="text-xs text-blue-400 hover:text-blue-300 font-medium transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Date Range */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Date Range
        </h3>
        <div className="flex flex-wrap gap-2">
          {DATE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateFilters({ dateRange: opt.value })}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filters.dateRange === opt.value
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:border-slate-600'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Amount Range — typeable inputs */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Amount Range
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Min</label>
            <input
              type="text"
              value={minAmountInput}
              onChange={(e) => setMinAmountInput(e.target.value)}
              onBlur={formatMinOnBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              placeholder="0"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1 block">Max</label>
            <input
              type="text"
              value={maxAmountInput}
              onChange={(e) => setMaxAmountInput(e.target.value)}
              onBlur={formatMaxOnBlur}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur()
                }
              }}
              placeholder="500"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-1.5">
          Numbers = millions (e.g. <code className="text-slate-400">10</code> = $10M). Use <code className="text-slate-400">k</code> for thousands (e.g. <code className="text-slate-400">500k</code>).
        </p>
      </div>

      {/* Funding Type */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
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
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-slate-300 group-hover/check:text-white transition-colors">
                {formatFundingType(type)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Industry */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
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
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-slate-300 group-hover/check:text-white transition-colors">
                {industry}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Country — multi-select */}
      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Country
        </h3>
        <div className="space-y-1.5">
          {COUNTRIES.map((c) => (
            <label
              key={c.value}
              className="flex items-center gap-2 cursor-pointer group/check"
            >
              <input
                type="checkbox"
                checked={filters.countries.includes(c.value)}
                onChange={() => toggleArrayItem('countries', c.value)}
                className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-0 cursor-pointer"
              />
              <span className="text-sm text-slate-300 group-hover/check:text-white transition-colors">
                {c.label}
              </span>
            </label>
          ))}
        </div>
        {filters.countries.length > 0 && (
          <p className="text-[10px] text-slate-500 mt-2">
            {filters.countries.length} selected
          </p>
        )}
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setOpen(!open)}
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-500 text-white p-3 rounded-full shadow-lg shadow-blue-600/30 transition-colors"
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
          fixed lg:sticky top-0 lg:top-0 right-0 lg:right-auto z-50 lg:z-auto
          h-full lg:h-auto w-80 lg:w-64 flex-shrink-0
          bg-slate-900 lg:bg-transparent border-l lg:border-l-0 border-slate-700/50
          p-6 overflow-y-auto
          transition-transform duration-300 lg:transition-none
          ${open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Mobile close button */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
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
