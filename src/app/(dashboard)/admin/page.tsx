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

  // Fetch ALL data for all 4 tabs in parallel
  const [agentRunsRes, auditsRes, alertsRes, profilesRes, prefsRes, authUsersRes, eventsRes] = await Promise.all([
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
    // Used for user flags (quality), alert counts (users), and engagement (read/bookmark)
    supabase
      .from('user_alerts')
      .select('id, user_id, user_flag, user_flag_at, read_at, is_bookmarked, funding_round:funding_rounds(company_name)')
      .order('user_flag_at', { ascending: false })
      .limit(50000),
    // Users + Engagement tabs
    supabase
      .from('profiles')
      .select('id, email, full_name, company, plan, stripe_customer_id, created_at')
      .order('created_at', { ascending: false }),
    supabase
      .from('user_preferences')
      .select(
        'user_id, linkedin_url, min_amount, max_amount, funding_types, countries, industries, slack_webhook_url, slack_channel_email, teams_webhook_url, teams_channel_email, telegram_chat_id, phone_number, phone_verified, push_subscription, imessage_enabled',
      ),
    // Engagement tab — last_sign_in_at is exposed by the auth admin API for free
    supabase.auth.admin.listUsers({ perPage: 1000 }),
    // Engagement tab — page tracker events (Phase 2). Query is best-effort: if
    // the table doesn't exist yet (migration not applied), we treat it as empty.
    supabase
      .from('user_events')
      .select('user_id, visitor_id, session_id, event_type, page_path, duration_ms, created_at')
      // eslint-disable-next-line react-hooks/purity
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      .limit(200000),
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

  // --- Engagement stats (server-computed) ---
  const authUsers = authUsersRes.data?.users || []
  const lastSignInByUser = new Map<string, string | null>(
    authUsers.map(u => [u.id, u.last_sign_in_at ?? null] as const)
  )

  // Per-user alert engagement
  const readByUser = new Map<string, number>()
  const bookmarksByUser = new Map<string, number>()
  for (const a of allAlerts) {
    if (a.read_at) readByUser.set(a.user_id, (readByUser.get(a.user_id) || 0) + 1)
    if (a.is_bookmarked) bookmarksByUser.set(a.user_id, (bookmarksByUser.get(a.user_id) || 0) + 1)
  }

  function channelsConfigured(p: typeof prefs[number] | undefined): number {
    if (!p) return 0
    let n = 0
    if (p.slack_webhook_url || p.slack_channel_email) n++
    if (p.teams_webhook_url || p.teams_channel_email) n++
    if (p.telegram_chat_id) n++
    if (p.phone_number && p.phone_verified) n++
    if (p.imessage_enabled) n++
    if (p.push_subscription) n++
    return n
  }

  // --- Page-tracker aggregations (Phase 2 data; safe to be empty) ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const events = (eventsRes.data || []) as any[]
  const eventsTableMissing = !!eventsRes.error
  // eslint-disable-next-line react-hooks/purity
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
  const sessionsByUser = new Map<string, Set<string>>()
  const sessionsAllTimeByUser = new Map<string, Set<string>>()
  const timeMsByUser = new Map<string, number>()
  const pagePathCounts = new Map<string, number>()
  const anonymousVisitorsByDay = new Map<string, Set<string>>()
  // Users who clicked through on an alert: visited /company/* OR clicked an outbound article link.
  // The page tracker writes outbound clicks as page_view events with `page_path = "outbound:<url>"`.
  const clickedAlertByUser = new Set<string>()
  for (const e of events) {
    const t = new Date(e.created_at).getTime()
    if (e.user_id) {
      if (!sessionsAllTimeByUser.has(e.user_id)) sessionsAllTimeByUser.set(e.user_id, new Set())
      sessionsAllTimeByUser.get(e.user_id)!.add(e.session_id)
    }
    if (e.user_id && t >= sevenDaysAgo) {
      if (!sessionsByUser.has(e.user_id)) sessionsByUser.set(e.user_id, new Set())
      sessionsByUser.get(e.user_id)!.add(e.session_id)
      if (e.event_type === 'session_end' && typeof e.duration_ms === 'number') {
        timeMsByUser.set(e.user_id, (timeMsByUser.get(e.user_id) || 0) + e.duration_ms)
      }
    }
    if (e.event_type === 'page_view' && e.user_id) {
      pagePathCounts.set(e.page_path, (pagePathCounts.get(e.page_path) || 0) + 1)
      if (e.page_path?.startsWith('/company/') || e.page_path?.startsWith('outbound:')) {
        clickedAlertByUser.add(e.user_id)
      }
    }
    if (e.event_type === 'page_view' && !e.user_id && e.visitor_id) {
      const day = e.created_at.slice(0, 10)
      if (!anonymousVisitorsByDay.has(day)) anonymousVisitorsByDay.set(day, new Set())
      anonymousVisitorsByDay.get(day)!.add(e.visitor_id)
    }
  }

  const engagementRows = profiles.map(p => {
    const lastSignIn = lastSignInByUser.get(p.id) ?? null
    const alertsReadRaw = readByUser.get(p.id) || 0
    const clickedAlert = clickedAlertByUser.has(p.id)
    // Broader "read an alert" = explicit mark-as-read OR clicked through to /company/* OR clicked outbound article link.
    // We surface the broader signal as alerts_read so the table column shows real engagement, not the rarely-set raw count.
    const engagedWithAlert = alertsReadRaw > 0 || clickedAlert
    const bookmarks = bookmarksByUser.get(p.id) || 0
    const channels = channelsConfigured(prefsByUser.get(p.id))
    const sessions7d = sessionsByUser.get(p.id)?.size || 0
    const sessionsAllTime = sessionsAllTimeByUser.get(p.id)?.size || 0
    const timeOnSite7dMin = Math.round((timeMsByUser.get(p.id) || 0) / 60000)
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      plan: p.plan as 'free' | 'pro',
      created_at: p.created_at,
      last_sign_in_at: lastSignIn,
      alerts_read: alertsReadRaw,
      engaged_with_alert: engagedWithAlert,
      bookmarks,
      channels_configured: channels,
      sessions_7d: sessions7d,
      sessions_all_time: sessionsAllTime,
      time_on_site_7d_min: timeOnSite7dMin,
    }
  })

  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const within = (iso: string | null, days: number) =>
    iso !== null && now - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000

  const engagementStats = {
    total: engagementRows.length,
    active7d: engagementRows.filter(r => within(r.last_sign_in_at, 7)).length,
    active30d: engagementRows.filter(r => within(r.last_sign_in_at, 30)).length,
    neverLoggedIn: engagementRows.filter(r => r.last_sign_in_at === null).length,
    zombie: engagementRows.filter(
      r => r.last_sign_in_at !== null && !r.engaged_with_alert && r.channels_configured === 0
    ).length,
    activated: engagementRows.filter(
      r => r.last_sign_in_at !== null && r.engaged_with_alert && r.channels_configured > 0
    ).length,
  }

  // Activation funnel — Signed up → Logged in → Logged in 3+× → Engaged with alert → Bookmarked → Channel
  const funnel = {
    signedUp: engagementRows.length,
    loggedIn: engagementRows.filter(r => r.last_sign_in_at !== null).length,
    loggedIn3Plus: engagementRows.filter(r => r.sessions_all_time >= 3).length,
    readAlert: engagementRows.filter(r => r.engaged_with_alert).length,
    bookmarked: engagementRows.filter(r => r.bookmarks > 0).length,
    configuredChannel: engagementRows.filter(r => r.channels_configured > 0).length,
  }

  const topPages = Array.from(pagePathCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  const anonymousDaily = Array.from(anonymousVisitorsByDay.entries())
    .map(([date, set]) => ({ date, visitors: set.size }))
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 14)

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
      engagementRows={engagementRows}
      engagementStats={engagementStats}
      funnel={funnel}
      topPages={topPages}
      anonymousDaily={anonymousDaily}
      eventsTableMissing={eventsTableMissing}
    />
  )
}
