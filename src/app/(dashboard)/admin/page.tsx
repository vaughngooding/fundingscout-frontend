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

  // Fetch ALL data for all tabs in parallel.
  // ENRICHMENT FILL-RATE QUERIES (added 2026-05-11 for the MCP launch):
  //   - 30-day rolling fill rate by funding_rounds.ceo_email
  //   - Rounds addressable by the new discover_ceo_for_domain path
  //   - Recent contact reveals from the new MCP audit log
  // eslint-disable-next-line react-hooks/purity
  const enrichmentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const [
    agentRunsRes, auditsRes, alertsRes, profilesRes, prefsRes, authUsersRes, eventsRes,
    enrichTotalRes, enrichEmailRes, enrichLinkedinRes, enrichAddressableRes,
    apiKeysRes, contactRevealsRes,
  ] = await Promise.all([
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
      .select('id, user_id, user_flag, user_flag_at, read_at, is_bookmarked, created_at, funding_round:funding_rounds(company_name)')
      .order('user_flag_at', { ascending: false })
      .limit(50000),
    // Users + Engagement tabs
    supabase
      .from('profiles')
      .select('id, email, full_name, company, plan, legacy_free, stripe_customer_id, created_at, last_email_opened_at, email_opens_total')
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

    // CEO email enrichment baseline (30-day rolling)
    supabase
      .from('funding_rounds')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', enrichmentSince),
    supabase
      .from('funding_rounds')
      .select('id', { count: 'exact', head: true })
      .not('ceo_email', 'is', null)
      .gte('created_at', enrichmentSince),
    supabase
      .from('funding_rounds')
      .select('id', { count: 'exact', head: true })
      .not('ceo_linkedin_url', 'is', null)
      .gte('created_at', enrichmentSince),
    // Rounds the new discover_ceo_for_domain flow could rescue: NULL email +
    // NULL ceo_name + non-NULL website. If this count keeps shrinking after
    // the gate change, the expansion is working.
    supabase
      .from('funding_rounds')
      .select('id', { count: 'exact', head: true })
      .is('ceo_email', null)
      .is('ceo_name', null)
      .not('website', 'is', null)
      .gte('created_at', enrichmentSince),

    // MCP API: active keys + recent contact reveals.
    // These tables may not exist yet if the 20260511_mcp_api_keys migration
    // hasn't run — wrap in try/empty via the catch fallback below.
    supabase
      .from('fs_api_keys')
      .select('id, user_id, name, prefix, created_at, last_used_at, revoked_at')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase
      .from('fs_contact_reveals')
      .select('id, key_id, user_id, funding_round_id, revealed_at')
      .gte('revealed_at', enrichmentSince)
      .order('revealed_at', { ascending: false })
      .limit(2000),
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
      plan: p.plan as 'free' | 'basic' | 'pro',
      legacy_free: (p as { legacy_free?: boolean }).legacy_free ?? false,
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
  const totalBasic = userRows.filter(r => r.plan === 'basic').length
  const totalLegacyFree = userRows.filter(r => r.plan === 'free' && r.legacy_free).length
  const totalPaywalled = userRows.filter(r => r.plan === 'free' && !r.legacy_free).length
  const totalPaying = userRows.filter(
    r => (r.plan === 'pro' || r.plan === 'basic') && r.stripe_customer_id,
  ).length

  // MRR estimate. Without per-row Stripe price IDs, we conservatively assume
  // every Pro is on the $89/mo Pro Monthly plan and every Basic is on the
  // $19.99/mo Basic Monthly plan. Annual subscribers will be over-counted in
  // a given month (we'd need to /12 their billing) — fix is to backfill
  // `profiles.stripe_price_id` in a follow-up so we can compute precisely.
  const proMrrPerUser = 89
  const basicMrrPerUser = 19.99
  const proPaying = userRows.filter(r => r.plan === 'pro' && r.stripe_customer_id).length
  const basicPaying = userRows.filter(r => r.plan === 'basic' && r.stripe_customer_id).length
  const mrr = Math.round(proPaying * proMrrPerUser + basicPaying * basicMrrPerUser)

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
  const nowMs = Date.now()
  const oneDayAgo = nowMs - 24 * 60 * 60 * 1000
  const sevenDaysAgo = nowMs - 7 * 24 * 60 * 60 * 1000
  const thirtyDaysAgo = nowMs - 30 * 24 * 60 * 60 * 1000
  const sessionsByUser = new Map<string, Set<string>>()
  const sessionsAllTimeByUser = new Map<string, Set<string>>()
  const timeMsByUser = new Map<string, number>()
  const pagePathCounts = new Map<string, number>()
  const anonymousVisitorsByDay = new Map<string, Set<string>>()
  // Users who clicked through on an alert: visited /company/* OR clicked an outbound article link.
  // The page tracker writes outbound clicks as page_view events with `page_path = "outbound:<url>"`.
  const clickedAlertByUser = new Set<string>()
  // Earliest "engaged" timestamp per user (for time-to-first-engagement metric).
  const firstEngagementByUser = new Map<string, number>()
  // Distinct company pages visited in last 30d per user (for filter-quality signal).
  const companiesViewed30dByUser = new Map<string, Set<string>>()
  // Stickiness: distinct user_ids active in 1d / 7d / 30d windows.
  const dauUsers = new Set<string>()
  const wauUsers = new Set<string>()
  const mauUsers = new Set<string>()
  for (const e of events) {
    const t = new Date(e.created_at).getTime()
    if (e.user_id) {
      if (!sessionsAllTimeByUser.has(e.user_id)) sessionsAllTimeByUser.set(e.user_id, new Set())
      sessionsAllTimeByUser.get(e.user_id)!.add(e.session_id)
      if (t >= oneDayAgo) dauUsers.add(e.user_id)
      if (t >= sevenDaysAgo) wauUsers.add(e.user_id)
      if (t >= thirtyDaysAgo) mauUsers.add(e.user_id)
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
      const isAlertEngagement = e.page_path?.startsWith('/company/') || e.page_path?.startsWith('outbound:')
      if (isAlertEngagement) {
        clickedAlertByUser.add(e.user_id)
        const existing = firstEngagementByUser.get(e.user_id)
        if (existing === undefined || t < existing) {
          firstEngagementByUser.set(e.user_id, t)
        }
        if (t >= thirtyDaysAgo && e.page_path?.startsWith('/company/')) {
          if (!companiesViewed30dByUser.has(e.user_id)) companiesViewed30dByUser.set(e.user_id, new Set())
          companiesViewed30dByUser.get(e.user_id)!.add(e.page_path)
        }
      }
    }
    if (e.event_type === 'page_view' && !e.user_id && e.visitor_id) {
      const day = e.created_at.slice(0, 10)
      if (!anonymousVisitorsByDay.has(day)) anonymousVisitorsByDay.set(day, new Set())
      anonymousVisitorsByDay.get(day)!.add(e.visitor_id)
    }
  }

  // Alerts received per user in last 30 days (for filter-quality signal).
  const alertsReceived30dByUser = new Map<string, number>()
  for (const a of allAlerts) {
    const ts = a.created_at ? new Date(a.created_at).getTime() : 0
    if (ts >= thirtyDaysAgo) {
      alertsReceived30dByUser.set(a.user_id, (alertsReceived30dByUser.get(a.user_id) || 0) + 1)
    }
  }

  const engagementRows = profiles.map(p => {
    const lastSignIn = lastSignInByUser.get(p.id) ?? null
    const alertsReadRaw = readByUser.get(p.id) || 0
    const clickedAlert = clickedAlertByUser.has(p.id)
    // Broader "read an alert" = explicit mark-as-read OR clicked through to /company/* OR clicked outbound article link.
    const engagedWithAlert = alertsReadRaw > 0 || clickedAlert
    const bookmarks = bookmarksByUser.get(p.id) || 0
    const channels = channelsConfigured(prefsByUser.get(p.id))
    const sessions7d = sessionsByUser.get(p.id)?.size || 0
    const sessionsAllTime = sessionsAllTimeByUser.get(p.id)?.size || 0
    const timeOnSite7dMin = Math.round((timeMsByUser.get(p.id) || 0) / 60000)
    // Time-to-first-engagement: ms between signup and earliest /company/* or outbound click.
    // null = never engaged (yet). Capped at the user's account age so it's not wildly misleading.
    const firstEngagementMs = firstEngagementByUser.get(p.id)
    const signupMs = new Date(p.created_at).getTime()
    const ttfeMin = firstEngagementMs ? Math.max(0, Math.round((firstEngagementMs - signupMs) / 60000)) : null
    // Filter quality: alerts received vs companies clicked through on (in last 30d).
    const alertsReceived30d = alertsReceived30dByUser.get(p.id) || 0
    const alertsEngaged30d = companiesViewed30dByUser.get(p.id)?.size || 0
    const engagementRate30d = alertsReceived30d > 0 ? alertsEngaged30d / alertsReceived30d : null
    return {
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      plan: p.plan as 'free' | 'basic' | 'pro',
      created_at: p.created_at,
      last_sign_in_at: lastSignIn,
      alerts_read: alertsReadRaw,
      engaged_with_alert: engagedWithAlert,
      bookmarks,
      channels_configured: channels,
      sessions_7d: sessions7d,
      sessions_all_time: sessionsAllTime,
      time_on_site_7d_min: timeOnSite7dMin,
      ttfe_min: ttfeMin,
      alerts_received_30d: alertsReceived30d,
      alerts_engaged_30d: alertsEngaged30d,
      engagement_rate_30d: engagementRate30d,
      // Email opens (Resend webhook). Will be undefined/null until the migration
      // is applied and the webhook fires; we surface what's available.
      last_email_opened_at: (p as { last_email_opened_at?: string | null }).last_email_opened_at ?? null,
      email_opens_total: (p as { email_opens_total?: number }).email_opens_total ?? 0,
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

  // Stickiness: DAU / WAU / MAU + ratios.
  const dau = dauUsers.size
  const wau = wauUsers.size
  const mau = mauUsers.size
  const dauWauRatio = wau > 0 ? dau / wau : 0
  const wauMauRatio = mau > 0 ? wau / mau : 0

  // Time-to-first-engagement: distribution + median (across users who DID engage).
  const ttfeMinsEngaged = engagementRows
    .map(r => r.ttfe_min)
    .filter((v): v is number => v !== null)
    .sort((a, b) => a - b)
  const ttfeMedianMin = ttfeMinsEngaged.length > 0
    ? ttfeMinsEngaged[Math.floor(ttfeMinsEngaged.length / 2)]
    : null
  const ttfeBuckets = {
    under1h: ttfeMinsEngaged.filter(m => m < 60).length,
    under24h: ttfeMinsEngaged.filter(m => m >= 60 && m < 24 * 60).length,
    under7d: ttfeMinsEngaged.filter(m => m >= 24 * 60 && m < 7 * 24 * 60).length,
    over7d: ttfeMinsEngaged.filter(m => m >= 7 * 24 * 60).length,
    neverEngaged: engagementRows.filter(r => r.ttfe_min === null).length,
  }

  const emailOpened30dCount = engagementRows.filter(r => within(r.last_email_opened_at, 30)).length
  const emailOpened7dCount = engagementRows.filter(r => within(r.last_email_opened_at, 7)).length

  const stickiness = {
    dau,
    wau,
    mau,
    dauWauRatio,
    wauMauRatio,
    ttfeMedianMin,
    ttfeBuckets,
    emailOpened30dCount,
    emailOpened7dCount,
  }

  // --- Enrichment fill rate (30-day rolling) ---
  const enrichTotal = enrichTotalRes.count ?? 0
  const enrichEmail = enrichEmailRes.count ?? 0
  const enrichLinkedin = enrichLinkedinRes.count ?? 0
  const enrichAddressable = enrichAddressableRes.count ?? 0
  const enrichmentStats = {
    total: enrichTotal,
    withEmail: enrichEmail,
    withLinkedin: enrichLinkedin,
    addressableByNewFlow: enrichAddressable,
    emailFillPct: enrichTotal ? Math.round((enrichEmail / enrichTotal) * 1000) / 10 : 0,
    linkedinFillPct: enrichTotal ? Math.round((enrichLinkedin / enrichTotal) * 1000) / 10 : 0,
  }

  // --- MCP API stats. If the tables don't exist yet (migration not applied),
  // both fall back to empty arrays so the admin page doesn't crash. ---
  const apiKeysAll = (apiKeysRes.data as Array<{ id: string; user_id: string; name: string; prefix: string; created_at: string; last_used_at: string | null; revoked_at: string | null }> | null) ?? []
  const contactReveals = (contactRevealsRes.data as Array<{ id: string; key_id: string; user_id: string; revealed_at: string }> | null) ?? []
  const apiStats = {
    activeKeys: apiKeysAll.filter(k => !k.revoked_at).length,
    revokedKeys: apiKeysAll.filter(k => k.revoked_at).length,
    keysUsedLast7d: apiKeysAll.filter(k => k.last_used_at && within(k.last_used_at, 7)).length,
    contactRevealsLast30d: contactReveals.length,
    contactRevealsLast7d: contactReveals.filter(r => within(r.revealed_at, 7)).length,
    contactRevealsLast24h: contactReveals.filter(r => within(r.revealed_at, 1)).length,
    tableMissing: apiKeysRes.error?.code === '42P01' || contactRevealsRes.error?.code === '42P01',
  }

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
      userStats={{ totalUsers, totalPro, totalBasic, totalLegacyFree, totalPaywalled, totalPaying, mrr }}
      engagementRows={engagementRows}
      engagementStats={engagementStats}
      funnel={funnel}
      topPages={topPages}
      anonymousDaily={anonymousDaily}
      stickiness={stickiness}
      eventsTableMissing={eventsTableMissing}
      enrichmentStats={enrichmentStats}
      apiStats={apiStats}
    />
  )
}
