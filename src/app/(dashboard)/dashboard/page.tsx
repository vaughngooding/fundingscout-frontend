import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import type { UserAlert, FundingRound, EarlyAlert } from '@/lib/types'

// Always fetch fresh — see (dashboard)/layout.tsx for why.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALL_ROUNDS_LIMIT = 200

// Customer-facing default: hide post-Series-A and later from the Early
// Alerts toggle. The internal HTML dashboard surfaces them in a separate
// audit tab; the customer view focuses on first-round / seed / Series A.
const EARLY_ALERTS_SHOW_STAGES = ['no_prior', 'seed_prior', 'ambiguous']

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile for plan info
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch user-specific alerts (matches), the firehose of all recent rounds,
  // and the early-alerts feed (active + recently-confirmed). The dashboard
  // client toggles between the three views.
  const [alertsResult, roundsResult, earlyAlertsResult] = await Promise.all([
    supabase
      .from('user_alerts')
      .select(`*, funding_round:funding_rounds(*)`)
      .eq('user_id', user.id)
      .neq('status', 'archived')
      .order('created_at', { ascending: false }),
    supabase
      .from('funding_rounds')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(ALL_ROUNDS_LIMIT),
    supabase
      .from('early_alerts')
      .select('*')
      .in('status', ['active', 'confirmed'])
      .in('stage_category', EARLY_ALERTS_SHOW_STAGES)
      .order('form_d_filing_date', { ascending: false }),
  ])

  if (alertsResult.error) {
    console.error('Error fetching alerts:', alertsResult.error)
  }
  if (roundsResult.error) {
    console.error('Error fetching all rounds:', roundsResult.error)
  }
  if (earlyAlertsResult.error) {
    console.error('Error fetching early alerts:', earlyAlertsResult.error)
  }

  return (
    <DashboardClient
      alerts={(alertsResult.data as UserAlert[]) || []}
      allRounds={(roundsResult.data as FundingRound[]) || []}
      earlyAlerts={(earlyAlertsResult.data as EarlyAlert[]) || []}
      plan={profile?.plan || 'free'}
      legacyFree={profile?.legacy_free ?? false}
    />
  )
}
