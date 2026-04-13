'use client'

import { useState } from 'react'
import Link from 'next/link'
import { landingContent } from '@/content/landing'

type BillingCycle = 'annual' | 'monthly'

const c = landingContent.pricing
const free = c.plans[0]
const pro = c.plans[1]

export default function PricingSection() {
  // Default to monthly so the headline price visitors see is $89/mo,
  // matching the rest of the marketing site. Annual is one click away.
  const [billing, setBilling] = useState<BillingCycle>('monthly')

  // Pull the right values for the Pro card based on the toggle.
  // The Pro plan has both Monthly + Annual fields (see src/content/landing.ts).
  const proPrice = billing === 'annual' ? pro.priceAnnual : pro.priceMonthly
  const proCtaHref = billing === 'annual' ? pro.ctaHrefAnnual : pro.ctaHrefMonthly
  const proBilledNote = billing === 'annual' ? pro.annualBilledNote : pro.monthlyBilledNote

  return (
    <section id="pricing" className="scroll-mt-24 bg-slate-900/40 px-6 py-14 sm:py-20">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
            {c.eyebrow}
          </p>
          <h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.02em] text-white sm:text-5xl md:text-6xl">
            {c.headline}
          </h2>
          <p className="mt-5 text-lg text-slate-400">{c.subheadline}</p>
        </div>

        {/* Annual / Monthly toggle */}
        <div className="mt-10 flex justify-center">
          <div className="inline-flex items-center gap-1 rounded-full bg-slate-900 p-1 ring-1 ring-slate-800">
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                billing === 'annual'
                  ? 'bg-emerald-600 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Annual
              <span className={`ml-2 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                billing === 'annual' ? 'bg-white/20 text-white' : 'bg-emerald-500/20 text-emerald-300'
              }`}>
                Save 45%
              </span>
            </button>
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`rounded-full px-5 py-2 text-sm font-semibold transition-all ${
                billing === 'monthly'
                  ? 'bg-emerald-600 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
          </div>
        </div>

        {/* Pricing cards */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {/* Free card */}
          <div className="relative flex flex-col rounded-3xl bg-slate-900 p-9 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.4)]">
            <div>
              <h3 className="text-base font-bold text-white">{free.name}</h3>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-6xl font-extrabold tracking-tight text-white">{free.price}</span>
                <span className="text-slate-500">{free.period}</span>
              </div>
              <p className="mt-4 text-sm text-slate-400">{free.description}</p>
            </div>

            <ul className="mt-8 flex flex-col gap-3.5 text-sm">
              {free.features.map((feature) => (
                <li key={feature.text} className="flex items-start gap-3">
                  {feature.included ? (
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  ) : (
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  )}
                  <span className={feature.included ? 'text-slate-300' : 'text-slate-600'}>
                    {feature.text}
                  </span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-10">
              <Link
                href={free.ctaHref}
                className="block w-full rounded-full bg-slate-800 py-4 text-center text-sm font-semibold text-white transition-all hover:bg-slate-700"
              >
                {free.cta}
              </Link>
            </div>
          </div>

          {/* Pro card */}
          <div className="relative flex flex-col rounded-3xl bg-gradient-to-br from-emerald-600 to-emerald-700 p-9 text-white shadow-2xl shadow-emerald-500/20">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-lg">
              Most Popular
            </div>

            <div>
              <h3 className="text-base font-bold">{pro.name}</h3>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-6xl font-extrabold tracking-tight">{proPrice}</span>
                <span className="text-emerald-100">{pro.period}</span>
              </div>
              <p className="mt-2 text-xs text-emerald-100">{proBilledNote}</p>
              <p className="mt-4 text-sm text-emerald-50">{pro.description}</p>
            </div>

            <ul className="mt-8 flex flex-col gap-3.5 text-sm">
              {pro.features.map((feature) => (
                <li key={feature.text} className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-emerald-50">{feature.text}</span>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-10">
              <Link
                href={proCtaHref}
                className="block w-full rounded-full bg-white py-4 text-center text-sm font-semibold text-emerald-700 shadow-lg transition-all hover:bg-emerald-50"
              >
                {pro.cta}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
