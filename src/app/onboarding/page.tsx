'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ROLES = [
  { value: 'SDR', label: 'SDR', desc: 'Sales Development Representative' },
  { value: 'AE', label: 'AE', desc: 'Account Executive' },
  { value: 'Sales Manager', label: 'Sales Manager', desc: 'Team lead or manager' },
  { value: 'Other', label: 'Other', desc: 'Founder, investor, or other role' },
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

const FUNDING_TYPES = [
  'pre-seed',
  'seed',
  'series-a',
  'series-b',
  'series-c',
  'series-d',
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

const TOTAL_STEPS = 4

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [role, setRole] = useState('')

  // Step 2
  const [industries, setIndustries] = useState<string[]>([])

  // Step 3
  const [minAmount, setMinAmount] = useState(0)
  const [maxAmount, setMaxAmount] = useState(100_000_000)
  const [fundingTypes, setFundingTypes] = useState<string[]>([])

  // Step 4
  const [digestFrequency, setDigestFrequency] = useState<'daily' | 'weekly'>('daily')
  const [slackWebhook, setSlackWebhook] = useState('')
  const [teamsWebhook, setTeamsWebhook] = useState('')

  function toggleIndustry(industry: string) {
    setIndustries((prev) =>
      prev.includes(industry)
        ? prev.filter((i) => i !== industry)
        : [...prev, industry]
    )
  }

  function toggleFundingType(type: string) {
    setFundingTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    )
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return role !== ''
      case 2:
        return industries.length > 0
      case 3:
        return fundingTypes.length > 0
      case 4:
        return true
      default:
        return false
    }
  }

  async function handleComplete() {
    setSaving(true)
    setError(null)

    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated. Please log in again.')
      setSaving(false)
      return
    }

    // Update profile with role
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id)

    if (profileError) {
      setError(`Failed to save profile: ${profileError.message}`)
      setSaving(false)
      return
    }

    // Upsert preferences
    const { error: prefsError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          min_amount: minAmount,
          max_amount: maxAmount,
          funding_types: fundingTypes,
          countries: [],
          industries,
          digest_frequency: digestFrequency,
          digest_hour: 9,
          slack_webhook_url: slackWebhook || null,
          teams_webhook_url: teamsWebhook || null,
        },
        { onConflict: 'user_id' }
      )

    if (prefsError) {
      setError(`Failed to save preferences: ${prefsError.message}`)
      setSaving(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Funding<span className="text-emerald-400">Pulse</span>
        </h1>
        <p className="mt-2 text-slate-400 text-sm">
          Let&apos;s set up your alert preferences
        </p>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-8">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-slate-500">
            Step {step} of {TOTAL_STEPS}
          </span>
          <span className="text-xs text-slate-500">
            {Math.round((step / TOTAL_STEPS) * 100)}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-lg bg-slate-900 border border-slate-700/50 rounded-xl p-8 shadow-2xl">
        {/* Error */}
        {error && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Step 1: Role */}
        {step === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              What&apos;s your role?
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              This helps us tailor the experience for you.
            </p>
            <div className="grid gap-3">
              {ROLES.map((r) => (
                <button
                  key={r.value}
                  onClick={() => setRole(r.value)}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    role === r.value
                      ? 'bg-blue-500/10 border-blue-500/40 ring-1 ring-blue-500/30'
                      : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="block text-sm font-semibold text-white">
                    {r.label}
                  </span>
                  <span className="block text-xs text-slate-400 mt-0.5">
                    {r.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Industries */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              What industries are you targeting?
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Select all that apply. You can change these later in settings.
            </p>
            <div className="flex flex-wrap gap-2">
              {INDUSTRIES.map((industry) => (
                <button
                  key={industry}
                  onClick={() => toggleIndustry(industry)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    industries.includes(industry)
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {industry}
                </button>
              ))}
            </div>
            {industries.length > 0 && (
              <p className="text-xs text-slate-500 mt-3">
                {industries.length} selected
              </p>
            )}
          </div>
        )}

        {/* Step 3: Funding range + types */}
        {step === 3 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              What funding rounds interest you?
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Set the amount range and round types you want to track.
            </p>

            {/* Amount sliders */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="flex items-center justify-between text-sm text-slate-300 mb-2">
                  <span>Minimum amount</span>
                  <span className="text-emerald-400 font-medium">
                    {formatAmountLabel(minAmount)}
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={500_000_000}
                  step={1_000_000}
                  value={minAmount}
                  onChange={(e) => setMinAmount(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
              <div>
                <label className="flex items-center justify-between text-sm text-slate-300 mb-2">
                  <span>Maximum amount</span>
                  <span className="text-emerald-400 font-medium">
                    {formatAmountLabel(maxAmount)}
                  </span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={500_000_000}
                  step={1_000_000}
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
              </div>
            </div>

            {/* Funding types */}
            <div>
              <h3 className="text-sm font-medium text-slate-300 mb-3">
                Round Types
              </h3>
              <div className="flex flex-wrap gap-2">
                {FUNDING_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleFundingType(type)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      fundingTypes.includes(type)
                        ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    {formatFundingType(type)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Delivery preferences */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              How do you want alerts?
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Choose your email digest frequency and optional integrations.
            </p>

            <div className="space-y-5">
              {/* Digest frequency */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email Digest
                </label>
                <div className="flex gap-3">
                  {(['daily', 'weekly'] as const).map((freq) => (
                    <button
                      key={freq}
                      onClick={() => setDigestFrequency(freq)}
                      className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium border text-center transition-all ${
                        digestFrequency === freq
                          ? 'bg-blue-500/10 text-blue-300 border-blue-500/40 ring-1 ring-blue-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {freq === 'daily' ? 'Daily' : 'Weekly'}
                      <span className="block text-xs text-slate-500 mt-0.5">
                        {freq === 'daily'
                          ? 'Every morning at 9am'
                          : 'Every Monday at 9am'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Slack */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Slack Webhook URL{' '}
                  <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={slackWebhook}
                  onChange={(e) => setSlackWebhook(e.target.value)}
                  placeholder="https://hooks.slack.com/services/..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-sm"
                />
              </div>

              {/* Teams */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  Teams Webhook URL{' '}
                  <span className="text-slate-500 font-normal">(optional)</span>
                </label>
                <input
                  type="url"
                  value={teamsWebhook}
                  onChange={(e) => setTeamsWebhook(e.target.value)}
                  placeholder="https://outlook.office.com/webhook/..."
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-colors text-sm"
                />
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-700/50">
          {step > 1 ? (
            <button
              onClick={() => setStep(step - 1)}
              className="text-sm text-slate-400 hover:text-white font-medium transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {step < TOTAL_STEPS ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canProceed()}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Setting up...' : 'Complete Setup'}
            </button>
          )}
        </div>
      </div>

      {/* Skip link */}
      {step < TOTAL_STEPS && (
        <button
          onClick={() => {
            router.push('/dashboard')
            router.refresh()
          }}
          className="mt-4 text-xs text-slate-500 hover:text-slate-400 transition-colors"
        >
          Skip for now
        </button>
      )}
    </div>
  )
}
