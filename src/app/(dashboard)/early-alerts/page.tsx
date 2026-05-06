import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import type { EarlyAlert, Profile } from '@/lib/types'
import { canUseProFeatures } from '@/lib/access'
import EarlyAlertCard from './EarlyAlertCard'

// Always fetch fresh — the early_alerts table mutates on the daily cron and
// we want users to see today's flags without waiting for an ISR boundary.
export const dynamic = 'force-dynamic'
export const revalidate = 0

// Customer-facing default: hide post-Series-A and later. Internal HTML still
// shows them in the "Hidden" tab; the customer view doesn't need that noise.
const SHOW_BY_DEFAULT = ['no_prior', 'seed_prior', 'ambiguous'] as const

export default async function EarlyAlertsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | undefined }>
}) {
  const params = await searchParams
  const showAllStages = params.all === '1'

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Profile drives the Pro gate — same pattern as bookmarks.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!canUseProFeatures(profile as Profile | null)) {
    return <ProUpsell />
  }

  // Pull active + confirmed (we surface both: active = the prediction list,
  // confirmed = the bragging-rights list with lead-time badges).
  let q = supabase
    .from('early_alerts')
    .select('*')
    .in('status', ['active', 'confirmed'])
    .order('form_d_filing_date', { ascending: false })

  if (!showAllStages) {
    q = q.in('stage_category', SHOW_BY_DEFAULT as unknown as string[])
  }

  const { data: rows, error } = await q
  if (error) {
    console.error('early-alerts: fetch failed', error)
  }

  const alerts = (rows as EarlyAlert[] | null) || []
  const active = alerts.filter((a) => a.status === 'active')
  const confirmed = alerts.filter((a) => a.status === 'confirmed')

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            Early Alerts
            <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-500 text-slate-900">
              New
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {active.length} active · {confirmed.length} confirmed
          </p>
        </div>
        <ToggleAllStages showAllStages={showAllStages} />
      </div>

      {/* Description + disclaimer (the customer copy from the plan file) */}
      <div className="mb-8 rounded-lg border border-slate-700/50 bg-slate-900/50 px-5 py-4 text-sm text-slate-300 leading-relaxed">
        <p>
          <strong className="text-white">Companies that have quietly filed a Form D</strong>{' '}
          with the SEC, signaling a funding round is in motion. Most announce
          publicly within 14 days. FundingScout catches these filings within
          hours and flags the ones matching our funding-round pattern.
        </p>
        <p className="mt-2">
          Form D is a regulatory filing companies submit when raising private
          capital — by law it goes up before any public announcement, which is
          why it&rsquo;s a leading indicator.
        </p>
        <p className="mt-3 text-amber-300/90">
          <strong>Disclaimer:</strong> This is a forward-looking signal, not a
          guarantee. Some flagged companies delay their announcement, withdraw
          the round, or never announce publicly. Use this list for speculative
          leads only — not commitments.
        </p>
      </div>

      {/* Active list */}
      <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
        Active ({active.length})
      </h2>
      {active.length > 0 ? (
        <div className="grid gap-3 mb-10">
          {active.map((a) => (
            <EarlyAlertCard key={a.id} alert={a} />
          ))}
        </div>
      ) : (
        <EmptyState
          msg="No active early alerts in the rolling 14-day window. Check back tomorrow — the list refreshes daily."
        />
      )}

      {/* Confirmed list */}
      {confirmed.length > 0 && (
        <>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Recently confirmed ({confirmed.length})
          </h2>
          <div className="grid gap-3 mb-10 opacity-90">
            {confirmed.map((a) => (
              <EarlyAlertCard key={a.id} alert={a} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function ToggleAllStages({ showAllStages }: { showAllStages: boolean }) {
  return (
    <Link
      href={showAllStages ? '/early-alerts' : '/early-alerts?all=1'}
      className="text-xs px-3 py-1.5 rounded-md border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
    >
      {showAllStages
        ? 'Show seed / Series A only'
        : 'Show all stages (incl. later-stage)'}
    </Link>
  )
}

function EmptyState({ msg }: { msg: string }) {
  return (
    <div className="text-center py-10 text-sm text-slate-400 rounded-lg border border-dashed border-slate-700">
      {msg}
    </div>
  )
}

function ProUpsell() {
  return (
    <div className="max-w-xl mx-auto text-center py-20">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 mb-6">
        <svg
          className="w-8 h-8 text-emerald-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <h1 className="text-2xl font-bold text-white mb-2">
        Early Alerts is a Pro feature
      </h1>
      <p className="text-slate-400 mb-2 max-w-md mx-auto">
        See companies that have filed a Form D with the SEC — likely to
        announce a public funding round within 14 days.
      </p>
      <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
        Forward-looking signal for speculative leads. Not a guarantee.
      </p>
      <Link
        href="/settings"
        className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
      >
        Upgrade to Pro
      </Link>
    </div>
  )
}
