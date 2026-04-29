import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import type { UserAlert, FundingRound } from '@/lib/types'

// Always fetch fresh — see (dashboard)/layout.tsx for why.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const ALL_ROUNDS_LIMIT = 200

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

  // Fetch user-specific alerts (matches) AND the firehose of all recent rounds.
  // The dashboard client toggles between the two views.
  const [alertsResult, roundsResult] = await Promise.all([
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
  ])

  if (alertsResult.error) {
    console.error('Error fetching alerts:', alertsResult.error)
  }
  if (roundsResult.error) {
    console.error('Error fetching all rounds:', roundsResult.error)
  }

  return (
    <DashboardClient
      alerts={(alertsResult.data as UserAlert[]) || []}
      allRounds={(roundsResult.data as FundingRound[]) || []}
      plan={profile?.plan || 'free'}
      legacyFree={profile?.legacy_free ?? false}
    />
  )
}
