import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SettingsForm from './SettingsForm'
import type { Profile, UserPreferences } from '@/lib/types'

export default async function SettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  // Fetch preferences
  const { data: preferences } = await supabase
    .from('user_preferences')
    .select('*')
    .eq('user_id', user.id)
    .single()

  // Provide defaults if preferences don't exist yet
  const defaultPreferences: UserPreferences = {
    id: '',
    user_id: user.id,
    min_amount: 0,
    max_amount: 100_000_000,
    funding_types: [],
    countries: [],
    industries: [],
    digest_frequency: 'daily',
    digest_hour: 9,
    slack_webhook_url: null,
    teams_webhook_url: null,
  }

  const defaultProfile: Profile = {
    id: user.id,
    email: user.email || '',
    full_name: null,
    company: null,
    role: null,
    plan: 'free',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    stripe_customer_id: null,
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400 mt-1">
          Manage your profile and alert preferences.
        </p>
      </div>

      <SettingsForm
        profile={(profile as Profile) || defaultProfile}
        preferences={(preferences as UserPreferences) || defaultPreferences}
      />
    </div>
  )
}
