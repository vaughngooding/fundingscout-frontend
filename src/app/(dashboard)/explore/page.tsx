import { createClient } from '@/lib/supabase/server'
import type { FundingRound, ExploreStats } from '@/lib/types'
import ExploreClient from './ExploreClient'

const PAGE_SIZE = 25

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
  const country = params.country || 'all'
  const amountMin = parseInt(params.amountMin || '0', 10)
  const amountMax = parseInt(params.amountMax || '500000000', 10)
  const dateRange = (params.dateRange || 'all') as 'today' | 'week' | 'month' | 'all'

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

  // Country filter
  if (country !== 'all') {
    query = query.eq('location_country', country)
  }

  // Amount range
  if (amountMin > 0) {
    query = query.gte('amount_usd', amountMin)
  }
  if (amountMax < 500_000_000) {
    query = query.lte('amount_usd', amountMax)
  }

  // Date range
  if (dateRange !== 'all') {
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
    // Dark wrapper — Explore page UI still uses dark theme, will be migrated in v1.1.
    // Negative margins push out to the edges of the bright dashboard layout.
    <div className="-mx-4 sm:-mx-6 -my-8 min-h-[calc(100vh-4rem)] bg-slate-950 px-4 sm:px-6 py-8 text-white">
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
          amountMin,
          amountMax,
          fundingTypes,
          industries,
          country,
        }}
      />
    </div>
  )
}
