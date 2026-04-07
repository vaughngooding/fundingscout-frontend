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
    telegram_chat_id: null,
    telegram_link_token: null,
    push_subscription: null,
    phone_number: null,
    phone_verified: false,
    imessage_enabled: false,
    slack_team_id: null,
    slack_channel_id: null,
    slack_bot_token: null,
    slack_app_installed: false,
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
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
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
