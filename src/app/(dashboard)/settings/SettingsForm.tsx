'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, UserPreferences } from '@/lib/types'

const FUNDING_TYPES = [
  'pre-seed',
  'seed',
  'series-a',
  'series-b',
  'series-c',
  'series-d',
]

const INDUSTRIES = [
  'AI/ML',
  'SaaS',
  'FinTech',
  'HealthTech',
  'Climate',
  'B2B',
  'B2C',
  'EdTech',
  'Security',
  'Data',
]

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'IL', label: 'Israel' },
  { value: 'IN', label: 'India' },
  { value: 'AU', label: 'Australia' },
  { value: 'SG', label: 'Singapore' },
]

function formatFundingType(type: string): string {
  return type.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatAmountLabel(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
  return `$${value}`
}

interface SettingsFormProps {
  profile: Profile
  preferences: UserPreferences
}

export default function SettingsForm({
  profile: initialProfile,
  preferences: initialPreferences,
}: SettingsFormProps) {
  const [profile, setProfile] = useState({
    full_name: initialProfile.full_name || '',
    company: initialProfile.company || '',
    role: initialProfile.role || '',
  })
  const [prefs, setPrefs] = useState({
    min_amount: initialPreferences.min_amount,
    max_amount: initialPreferences.max_amount,
    funding_types: initialPreferences.funding_types,
    countries: initialPreferences.countries,
    industries: initialPreferences.industries,
    digest_frequency: initialPreferences.digest_frequency,
    digest_hour: initialPreferences.digest_hour,
    slack_webhook_url: initialPreferences.slack_webhook_url || '',
    teams_webhook_url: initialPreferences.teams_webhook_url || '',
  })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{
    type: 'success' | 'error'
    message: string
  } | null>(null)

  function toggleArrayItem(
    key: 'funding_types' | 'countries' | 'industries',
    item: string
  ) {
    const current = prefs[key]
    const updated = current.includes(item)
      ? current.filter((i) => i !== item)
      : [...current, item]
    setPrefs({ ...prefs, [key]: updated })
  }

  async function handleSave() {
    setSaving(true)
    setToast(null)

    const supabase = createClient()

    // Update profile
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name || null,
        company: profile.company || null,
        role: profile.role || null,
      })
      .eq('id', initialProfile.id)

    if (profileError) {
      setToast({ type: 'error', message: `Profile update failed: ${profileError.message}` })
      setSaving(false)
      return
    }

    // Upsert preferences
    const { error: prefsError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: initialProfile.id,
          min_amount: prefs.min_amount,
          max_amount: prefs.max_amount,
          funding_types: prefs.funding_types,
          countries: prefs.countries,
          industries: prefs.industries,
          digest_frequency: prefs.digest_frequency,
          digest_hour: prefs.digest_hour,
          slack_webhook_url: prefs.slack_webhook_url || null,
          teams_webhook_url: prefs.teams_webhook_url || null,
        },
        { onConflict: 'user_id' }
      )

    if (prefsError) {
      setToast({ type: 'error', message: `Preferences update failed: ${prefsError.message}` })
      setSaving(false)
      return
    }

    setToast({ type: 'success', message: 'Settings saved successfully.' })
    setSaving(false)

    // Auto-dismiss toast
    setTimeout(() => setToast(null), 4000)
  }

  return (
    <div className="max-w-2xl space-y-8">
      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed top-20 right-6 z-50 px-4 py-3 rounded-lg border shadow-lg text-sm font-medium transition-all ${
            toast.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Profile Section */}
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Profile</h2>
        <div className="grid gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) =>
                setProfile({ ...profile, full_name: e.target.value })
              }
              placeholder="John Smith"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Company
            </label>
            <input
              type="text"
              value={profile.company}
              onChange={(e) =>
                setProfile({ ...profile, company: e.target.value })
              }
              placeholder="Acme Corp"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Role
            </label>
            <select
              value={profile.role}
              onChange={(e) =>
                setProfile({ ...profile, role: e.target.value })
              }
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            >
              <option value="">Select your role</option>
              <option value="SDR">SDR</option>
              <option value="AE">Account Executive</option>
              <option value="Sales Manager">Sales Manager</option>
              <option value="VP Sales">VP Sales</option>
              <option value="Founder">Founder</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>
      </section>

      {/* Preferences Section */}
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Alert Preferences
        </h2>
        <div className="space-y-6">
          {/* Amount Range */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              Funding Amount Range
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Min: {formatAmountLabel(prefs.min_amount)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={500_000_000}
                  step={1_000_000}
                  value={prefs.min_amount}
                  onChange={(e) =>
                    setPrefs({ ...prefs, min_amount: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">
                  Max: {formatAmountLabel(prefs.max_amount)}
                </label>
                <input
                  type="range"
                  min={0}
                  max={500_000_000}
                  step={1_000_000}
                  value={prefs.max_amount}
                  onChange={(e) =>
                    setPrefs({ ...prefs, max_amount: Number(e.target.value) })
                  }
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Funding Types */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              Funding Types
            </h3>
            <div className="flex flex-wrap gap-2">
              {FUNDING_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleArrayItem('funding_types', type)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    prefs.funding_types.includes(type)
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {formatFundingType(type)}
                </button>
              ))}
            </div>
          </div>

          {/* Industries */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              Industries
            </h3>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((industry) => (
                <button
                  key={industry}
                  type="button"
                  onClick={() => toggleArrayItem('industries', industry)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    prefs.industries.includes(industry)
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {industry}
                </button>
              ))}
            </div>
          </div>

          {/* Countries */}
          <div>
            <h3 className="text-sm font-medium text-slate-300 mb-3">
              Countries
            </h3>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((country) => (
                <button
                  key={country.value}
                  type="button"
                  onClick={() => toggleArrayItem('countries', country.value)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                    prefs.countries.includes(country.value)
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {country.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Section */}
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Delivery</h2>
        <div className="space-y-4">
          {/* Digest Frequency */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Digest Frequency
            </label>
            <div className="flex gap-3">
              {(['daily', 'weekly'] as const).map((freq) => (
                <button
                  key={freq}
                  type="button"
                  onClick={() =>
                    setPrefs({ ...prefs, digest_frequency: freq })
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    prefs.digest_frequency === freq
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {freq.charAt(0).toUpperCase() + freq.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Digest Hour */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Digest Time (hour, 24h format)
            </label>
            <select
              value={prefs.digest_hour}
              onChange={(e) =>
                setPrefs({ ...prefs, digest_hour: Number(e.target.value) })
              }
              className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            >
              {Array.from({ length: 24 }, (_, i) => (
                <option key={i} value={i}>
                  {i.toString().padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </div>

          {/* Slack Webhook */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Slack Webhook URL
            </label>
            <input
              type="url"
              value={prefs.slack_webhook_url}
              onChange={(e) =>
                setPrefs({ ...prefs, slack_webhook_url: e.target.value })
              }
              placeholder="https://hooks.slack.com/services/..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">
              Optional. Receive alerts directly in your Slack channel.
            </p>
          </div>

          {/* Teams Webhook */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5">
              Microsoft Teams Webhook URL
            </label>
            <input
              type="url"
              value={prefs.teams_webhook_url}
              onChange={(e) =>
                setPrefs({ ...prefs, teams_webhook_url: e.target.value })
              }
              placeholder="https://outlook.office.com/webhook/..."
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors"
            />
            <p className="text-xs text-slate-500 mt-1">
              Optional. Receive alerts directly in your Teams channel.
            </p>
          </div>
        </div>
      </section>

      {/* Plan Info */}
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                initialProfile.plan === 'pro'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-slate-700 text-slate-300 border border-slate-600'
              }`}
            >
              {initialProfile.plan === 'pro' ? 'Pro' : 'Free'}
            </span>
            <p className="text-sm text-slate-400 mt-1">
              {initialProfile.plan === 'pro'
                ? 'Unlimited alerts, bookmarks, and integrations.'
                : 'Limited to basic alerts. Upgrade for full access.'}
            </p>
          </div>
          {initialProfile.plan !== 'pro' && (
            <button
              type="button"
              className="flex-shrink-0 ml-4 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
            >
              Upgrade to Pro
            </button>
          )}
        </div>
      </section>

      {/* Save button */}
      <div className="flex justify-end pb-8">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}
