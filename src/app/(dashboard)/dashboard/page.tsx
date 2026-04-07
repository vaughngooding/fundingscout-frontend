import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardClient from './DashboardClient'
import type { UserAlert } from '@/lib/types'

// Always fetch fresh — see (dashboard)/layout.tsx for why.
export const dynamic = 'force-dynamic'
export const revalidate = 0

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

  // Fetch user alerts with funding round data
  const { data: alerts, error } = await supabase
    .from('user_alerts')
    .select(
      `
      *,
      funding_round:funding_rounds(*)
    `
    )
    .eq('user_id', user.id)
    .neq('status', 'archived')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching alerts:', error)
  }

  return (
    <DashboardClient
      alerts={(alerts as UserAlert[]) || []}
      plan={profile?.plan || 'free'}
    />
  )
}
