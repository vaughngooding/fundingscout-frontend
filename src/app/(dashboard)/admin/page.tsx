import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import AdminClient from './AdminClient'

const ADMIN_USER_IDS = new Set<string>([
  '17ffe015-825d-4326-b52f-d3c795ac3d43',
])

export const dynamic = 'force-dynamic'
export const revalidate = 0

const FIELDS = ['company_name', 'amount_usd', 'funding_type', 'location', 'ceo_name', 'website', 'investors', 'lead_investor']

export default async function AdminDashboard() {
  // Auth check
  const authClient = await createServerClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user || !ADMIN_USER_IDS.has(user.id)) notFound()

  // Service role client for admin queries
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )

  // Fetch ALL data for all 3 tabs in parallel
  const [agentRunsRes, auditsRes, alertsRes, profilesRes, prefsRes] = await Promise.all([
    // Quality + Usage tabs
    supabase
      .from('agent_runs')
      .select('id,agent,run_at,duration_ms,domain,items,errors,learnings,summary')
      .order('run_at', { ascending: false })
      .limit(50000),
    supabase
      .from('alert_audits')
      .select('*, funding_round:funding_rounds(company_name, source_feed, amount_usd, funding_type)')
      .order('created_at', { ascending: false })
      .limit(100),
    // Used for both user flags (quality tab) and alert counts (users tab)
    supabase
      .from('user_alerts')
      .select('id, user_id, user_flag, user_flag_at, funding_round:funding_rounds(company_name)')
      .order('user_flag_at', { ascending: false })
      .limit(50000),
    // Users tab
    supabase
      .from('profiles')
      .select('id, email, full_name, company, plan, stripe_customer_id, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_preferences')
      .select(
        'user_id, linkedin_url, min_amount, max_amount, funding_types, countries, industries, slack_webhook_url, slack_channel_email, teams_webhook_url, teams_channel_email, telegram_chat_id, phone_number, phone_verified, push_subscription, imessage_enabled',
      ),
  ])

  const agentRuns = agentRunsRes.data || []
  const audits = auditsRes.data || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allAlerts = (alertsRes.data || []) as any[]
  const userFlags = allAlerts.filter((a: { user_flag: string | null }) => a.user_flag !== null)
  const profiles = profilesRes.data || []
  const prefs = prefsRes.data || []

  // --- Quality stats (server-computed) ---
  const totalAudited = audits.length
  const fundingCount = audits.filter(a => a.classification === 'FUNDING').length
  const notFundingCount = audits.filter(a => a.classification === 'NOT_FUNDING').length
  const scores = audits.map(a => a.accuracy_score).filter((s): s is number => s !== null)
  const avgAccuracy = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
  const fpRate = totalAudited ? notFundingCount / totalAudited : 0

  // Field accuracy
  const fieldStats: Record<string, { correct: number; incorrect: number; unverifiable: number; not_extracted: number }> = {}
  for (const f of FIELDS) fieldStats[f] = { correct: 0, incorrect: 0, unverifiable: 0, not_extracted: 0 }
  for (const a of audits) {
    const verdicts = typeof a.field_verdicts === 'string' ? JSON.parse(a.field_verdicts) : a.field_verdicts
    if (!verdicts) continue
    for (const [field, verdict] of Object.entries(verdicts)) {
      if (!fieldStats[field]) continue
      const v = verdict as string
      if (v === 'CORRECT') fieldStats[field].correct++
      else if (v === 'INCORRECT') fieldStats[field].incorrect++
      else if (v === 'UNVERIFIABLE') fieldStats[field].unverifiable++
      else fieldStats[field].not_extracted++
    }
  }

  // Source accuracy
  const sourceStats: Record<string, { total: number; funding: number; not_funding: number }> = {}
  for (const a of audits) {
    const source = a.funding_round?.source_feed || 'unknown'
    if (!sourceStats[source]) sourceStats[source] = { total: 0, funding: 0, not_funding: 0 }
    sourceStats[source].total++
    if (a.classification === 'FUNDING') sourceStats[source].funding++
    if (a.classification === 'NOT_FUNDING') sourceStats[source].not_funding++
  }
  const sortedSources = Object.entries(sourceStats).sort((a, b) =>
    (b[1].not_funding / b[1].total) - (a[1].not_funding / a[1].total)
  )

  // --- Users stats (server-computed) ---
  const prefsByUser = new Map(prefs.map(p => [p.user_id, p] as const))
  const alertCountByUser = new Map<string, number>()
  for (const a of allAlerts) {
    alertCountByUser.set(a.user_id, (alertCountByUser.get(a.user_id) || 0) + 1)
  }

  const userRows = profiles.map(p => {
    const up = prefsByUser.get(p.id)
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      company: p.company,
      plan: p.plan as 'free' | 'pro',
      stripe_customer_id: p.stripe_customer_id,
      created_at: p.created_at,
      linkedin_url: up?.linkedin_url ?? null,
      min_amount: up?.min_amount ?? null,
      max_amount: up?.max_amount ?? null,
      funding_types: up?.funding_types ?? null,
      countries: up?.countries ?? null,
      industries: up?.industries ?? null,
      slack_webhook_url: up?.slack_webhook_url ?? null,
      slack_channel_email: up?.slack_channel_email ?? null,
      teams_webhook_url: up?.teams_webhook_url ?? null,
      teams_channel_email: up?.teams_channel_email ?? null,
      telegram_chat_id: up?.telegram_chat_id ?? null,
      phone_number: up?.phone_number ?? null,
      phone_verified: up?.phone_verified ?? null,
      push_subscription: up?.push_subscription ?? null,
      imessage_enabled: up?.imessage_enabled ?? null,
      alert_count: alertCountByUser.get(p.id) || 0,
    }
  })

  const totalUsers = userRows.length
  const totalPro = userRows.filter(r => r.plan === 'pro').length
  const totalFree = userRows.filter(r => r.plan === 'free').length
  const totalPaying = userRows.filter(r => r.plan === 'pro' && r.stripe_customer_id).length
  const mrr = totalPaying * 89

  return (
    <AdminClient
      agentRuns={agentRuns}
      audits={audits}
      userFlags={userFlags}
      qualityStats={{
        totalAudited,
        fundingCount,
        notFundingCount,
        avgAccuracy,
        fpRate,
        fieldStats,
        sortedSources,
      }}
      userRows={userRows}
      userStats={{ totalUsers, totalPro, totalFree, totalPaying, mrr }}
    />
  )
}
