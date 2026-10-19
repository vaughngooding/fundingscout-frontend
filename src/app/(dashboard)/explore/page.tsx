import { createClient } from '@/lib/supabase/server'
import type { FundingRound, ExploreStats } from '@/lib/types'
import type { DateRange } from '@/components/FilterSidebar'
import ExploreClient from './ExploreClient'

const PAGE_SIZE = 25

const DATE_RANGE_VALUES: readonly DateRange[] = [
  'today',
  'week',
  'month',
  'quarter',
  'all',
  'custom',
]

// Accept only strict YYYY-MM-DD from the URL. Anything else (malformed,
// injection attempts, full ISO timestamps) is treated as absent.
function parseIsoDate(value: string | undefined): string | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(`${value}T00:00:00Z`)
  return isNaN(d.getTime()) ? null : value
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  // Parse query params
  const page = Math.max(1, parseInt(params.page || '1', 10))
  const search = params.search || ''
  const sort = params.sort || 'date'
  const fundingTypes = params.types ? params.types.split(',') : []
  const industries = params.industries ? params.industries.split(',') : []
  // Multi-country: ?countries=US,CA  (still accept legacy ?country=US for backwards compat)
  const countries = params.countries
    ? params.countries.split(',').filter(Boolean)
    : params.country && params.country !== 'all'
      ? [params.country]
      : []
  const amountMin = parseInt(params.amountMin || '0', 10)
  const amountMax = parseInt(params.amountMax || '500000000', 10)
  const rawDateRange = params.dateRange || 'all'
  const dateRange: DateRange = DATE_RANGE_VALUES.includes(rawDateRange as DateRange)
    ? (rawDateRange as DateRange)
    : 'all'
  let dateFrom = dateRange === 'custom' ? parseIsoDate(params.dateFrom) : null
  let dateTo = dateRange === 'custom' ? parseIsoDate(params.dateTo) : null
  // An inverted range (from > to) would match nothing; swap rather than 500.
  if (dateFrom && dateTo && dateFrom > dateTo) {
    ;[dateFrom, dateTo] = [dateTo, dateFrom]
  }

  // Fetch stats via RPC
  const { data: statsData } = await supabase.rpc('get_explore_stats')
  const stats: ExploreStats | null = statsData as ExploreStats | null

  // Build query
  let query = supabase
    .from('funding_rounds')
    .select('*', { count: 'exact' })

  // Search
  if (search) {
    query = query.ilike('company_name', `%${search}%`)
  }

  // Funding type filter
  if (fundingTypes.length > 0) {
    query = query.in('funding_type', fundingTypes)
  }

  // Country filter (multi-select)
  if (countries.length > 0) {
    query = query.in('location_country', countries)
  }

  // Amount range
  if (amountMin > 0) {
    query = query.gte('amount_usd', amountMin)
  }
  if (amountMax < 500_000_000) {
    query = query.lte('amount_usd', amountMax)
  }

  // Date range
  if (dateRange === 'custom') {
    // Inclusive bounds. `created_at` is timestamptz; bound the day in UTC so
    // the query is deterministic regardless of the server's TZ. To is
    // exclusive-next-day rather than 23:59:59.999 to avoid sub-ms gaps.
    if (dateFrom) {
      query = query.gte('created_at', `${dateFrom}T00:00:00.000Z`)
    }
    if (dateTo) {
      const next = new Date(`${dateTo}T00:00:00.000Z`)
      next.setUTCDate(next.getUTCDate() + 1)
      query = query.lt('created_at', next.toISOString())
    }
  } else if (dateRange !== 'all') {
    const now = new Date()
    let cutoff: Date
    switch (dateRange) {
      case 'today':
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        cutoff = new Date(now.getTime() - 7 * 86_400_000)
        break
      case 'month':
        cutoff = new Date(now.getTime() - 30 * 86_400_000)
        break
      case 'quarter':
        cutoff = new Date(now.getTime() - 90 * 86_400_000)
        break
      default:
        cutoff = new Date(0)
    }
    query = query.gte('created_at', cutoff.toISOString())
  }

  // Industry filter — check overlap with industry_tags array
  if (industries.length > 0) {
    query = query.overlaps('industry_tags', industries)
  }

  // Sort
  switch (sort) {
    case 'amount_desc':
      query = query.order('amount_usd', { ascending: false })
      break
    case 'amount_asc':
      query = query.order('amount_usd', { ascending: true })
      break
    case 'company':
      query = query.order('company_name', { ascending: true })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  // Pagination
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  query = query.range(from, to)

  const { data: rounds, count } = await query
  const totalCount = count || 0
  const totalPages = Math.ceil(totalCount / PAGE_SIZE)

  return (
    <ExploreClient
      rounds={(rounds || []) as FundingRound[]}
      stats={stats}
      totalCount={totalCount}
      totalPages={totalPages}
      currentPage={page}
      initialSearch={search}
      initialSort={sort}
      initialFilters={{
        dateRange,
        dateFrom,
        dateTo,
        amountMin,
        amountMax,
        fundingTypes,
        industries,
        countries,
      }}
    />
  )
}
