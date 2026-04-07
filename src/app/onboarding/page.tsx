'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const ROLES = [
  { value: 'SDR', label: 'SDR', desc: 'Sales Development Representative' },
  { value: 'AE', label: 'AE', desc: 'Account Executive' },
  { value: 'Sales Manager', label: 'Sales Manager', desc: 'Team lead or manager' },
  { value: 'Founder', label: 'Founder', desc: 'Founder or co-founder' },
  { value: 'Investor', label: 'Investor', desc: 'VC, angel, or LP' },
  { value: 'Other', label: 'Other', desc: 'Any other role' },
]

const COUNTRIES = [
  { value: 'US', label: 'United States' },
  { value: 'CA', label: 'Canada' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'NL', label: 'Netherlands' },
  { value: 'IL', label: 'Israel' },
  { value: 'IN', label: 'India' },
  { value: 'SG', label: 'Singapore' },
  { value: 'AU', label: 'Australia' },
  { value: 'BR', label: 'Brazil' },
  { value: 'WW', label: 'Worldwide' },
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

// useSearchParams must be inside a Suspense boundary during static prerender.
// Wrapper at the bottom of the file provides it.
function OnboardingPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  // ?plan=annual or ?plan=monthly carries through from the landing pricing CTAs
  // via signup. If present, we pre-select Pro and the right billing cycle so
  // the user can confirm and pay without re-picking.
  const planFromUrl = searchParams.get('plan') // 'annual' | 'monthly' | null

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [upgrading, setUpgrading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1: Role
  const [role, setRole] = useState('')

  // Step 2: Geographies
  const [countries, setCountries] = useState<string[]>([])

  // Step 3: Funding range + types
  const [minAmount, setMinAmount] = useState(0)
  const [maxAmount, setMaxAmount] = useState(100_000_000)
  const [fundingTypes, setFundingTypes] = useState<string[]>([])

  // Step 4: Plan choice — pre-selected from URL if present, else free
  const [chosenPlan, setChosenPlan] = useState<'free' | 'pro'>(
    planFromUrl === 'annual' || planFromUrl === 'monthly' ? 'pro' : 'free',
  )
  // Annual is the default for Pro (matches landing page default)
  const [billingCycle, setBillingCycle] = useState<'annual' | 'monthly'>(
    planFromUrl === 'monthly' ? 'monthly' : 'annual',
  )

  function toggleCountry(country: string) {
    setCountries((prev) =>
      prev.includes(country) ? prev.filter((c) => c !== country) : [...prev, country],
    )
  }

  function toggleFundingType(type: string) {
    setFundingTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    )
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return role !== ''
      case 2:
        return countries.length > 0
      case 3:
        return fundingTypes.length > 0
      case 4:
        return true
      default:
        return false
    }
  }

  // Persist preferences. If `goPro` is true, also redirect to Stripe Checkout.
  async function savePrefs(): Promise<boolean> {
    setError(null)
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      setError('Not authenticated. Please log in again.')
      return false
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ role })
      .eq('id', user.id)

    if (profileError) {
      setError(`Failed to save profile: ${profileError.message}`)
      return false
    }

    const { error: prefsError } = await supabase
      .from('user_preferences')
      .upsert(
        {
          user_id: user.id,
          min_amount: minAmount,
          max_amount: maxAmount,
          funding_types: fundingTypes,
          countries,
          industries: [],
          digest_frequency: 'daily',
          digest_hour: 9,
          slack_webhook_url: null,
          teams_webhook_url: null,
        },
        { onConflict: 'user_id' },
      )

    if (prefsError) {
      setError(`Failed to save preferences: ${prefsError.message}`)
      return false
    }

    return true
  }

  async function handleFreeContinue() {
    setSaving(true)
    const ok = await savePrefs()
    setSaving(false)
    if (ok) {
      router.push('/dashboard')
      router.refresh()
    }
  }

  async function handleGoPro() {
    setUpgrading(true)
    const ok = await savePrefs()
    if (!ok) {
      setUpgrading(false)
      return
    }
    try {
      const res = await fetch('/api/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: billingCycle }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to start checkout')
        setUpgrading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setUpgrading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Funding<span className="text-emerald-400">Scout</span>
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

        {/* Step 2: Geographies */}
        {step === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              Which geographies do you care about?
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              We&apos;ll only alert you about funding rounds in these regions. Pick &ldquo;Worldwide&rdquo; to see everything.
            </p>
            <div className="flex flex-wrap gap-2">
              {COUNTRIES.map((c) => (
                <button
                  key={c.value}
                  onClick={() => toggleCountry(c.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                    countries.includes(c.value)
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
            {countries.length > 0 && (
              <p className="text-xs text-slate-500 mt-3">
                {countries.length} selected
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

        {/* Step 4: Choose Free vs Pro */}
        {step === 4 && (
          <div>
            <h2 className="text-xl font-semibold text-white mb-1">
              Choose how you want alerts
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              You can change this anytime in Settings.
            </p>

            <div className="grid gap-4">
              {/* Free plan card */}
              <button
                type="button"
                onClick={() => setChosenPlan('free')}
                className={`text-left p-5 rounded-xl border-2 transition-all ${
                  chosenPlan === 'free'
                    ? 'bg-slate-800 border-slate-500 ring-1 ring-slate-400/30'
                    : 'bg-slate-800/40 border-slate-700 hover:border-slate-600'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-bold text-white">Free</span>
                  <span className="text-sm font-semibold text-slate-300">$0/mo</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Get a daily or weekly funding digest delivered to your email inbox.
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400">✓</span>
                    Daily or weekly email digest
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-300">
                    <span className="text-emerald-400">✓</span>
                    Web dashboard access
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="text-slate-600">✗</span>
                    Real-time alerts
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-500">
                    <span className="text-slate-600">✗</span>
                    SMS / Slack / Telegram delivery
                  </li>
                </ul>
              </button>

              {/* Pro plan card */}
              <div
                className={`text-left p-5 rounded-xl border-2 transition-all relative ${
                  chosenPlan === 'pro'
                    ? 'bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border-emerald-400 ring-2 ring-emerald-400/30'
                    : 'bg-slate-800/40 border-slate-700 hover:border-emerald-500/40'
                }`}
              >
                <button
                  type="button"
                  onClick={() => setChosenPlan('pro')}
                  className="w-full text-left"
                >
                  <div className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-emerald-500 text-xs font-bold text-slate-900">
                    RECOMMENDED
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-base font-bold text-white">Pro</span>
                    <span className="text-sm font-semibold text-emerald-300">
                      {billingCycle === 'annual' ? '$49/mo' : '$89/mo'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mb-2">
                    {billingCycle === 'annual'
                      ? 'Billed $588 once a year — save $480 vs monthly'
                      : 'Billed monthly. Cancel anytime.'}
                  </p>
                </button>

                {/* Annual / Monthly toggle inside the Pro card */}
                <div className="mb-3 mt-1 inline-flex rounded-full bg-slate-900/70 p-0.5 ring-1 ring-slate-700">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setBillingCycle('annual')
                      setChosenPlan('pro')
                    }}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all ${
                      billingCycle === 'annual'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Annual
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setBillingCycle('monthly')
                      setChosenPlan('pro')
                    }}
                    className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-all ${
                      billingCycle === 'monthly'
                        ? 'bg-emerald-600 text-white shadow'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Monthly
                  </button>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  Real-time funding alerts pushed to your phone, Slack, Teams, Telegram, or WhatsApp the moment a round is announced.
                </p>
                <ul className="space-y-1.5">
                  <li className="flex items-start gap-2 text-xs text-slate-200">
                    <span className="text-emerald-400">✓</span>
                    <strong className="text-white">Real-time</strong> alerts (within 1 min of news breaking)
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-200">
                    <span className="text-emerald-400">✓</span>
                    <strong className="text-white">SMS</strong> to your phone
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-200">
                    <span className="text-emerald-400">✓</span>
                    <strong className="text-white">Slack</strong>, <strong className="text-white">Telegram</strong>, Teams
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-200">
                    <span className="text-emerald-400">✓</span>
                    <strong className="text-white">WhatsApp</strong> <span className="text-slate-500">(coming soon)</span>
                  </li>
                  <li className="flex items-start gap-2 text-xs text-slate-200">
                    <span className="text-emerald-400">✓</span>
                    Email digest, dashboard, bookmarks, CSV export
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-slate-500 mt-4 text-center">
              Want to add an integration like Slack or Telegram later? Find them in <strong className="text-slate-400">Settings → Integrations</strong>.
            </p>
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
          ) : chosenPlan === 'pro' ? (
            <button
              onClick={handleGoPro}
              disabled={upgrading}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-400 hover:to-blue-400 text-white text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-500/30"
            >
              {upgrading ? 'Loading checkout…' : 'Continue to Pro Checkout →'}
            </button>
          ) : (
            <button
              onClick={handleFreeContinue}
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Setting up...' : 'Start with Free →'}
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

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950" />}>
      <OnboardingPageInner />
    </Suspense>
  )
}
