import Link from 'next/link'
import { landingContent as c } from '@/content/landing'

// Tiny inline SVG icon set for the feature grid (no extra deps)
const ICONS: Record<string, React.ReactNode> = {
  phone: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </svg>
  ),
  chat: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  ),
  filter: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
    </svg>
  ),
  email: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  ),
  dashboard: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5m.75-9l3-3 2.148 2.148A12.061 12.061 0 0116.5 7.605" />
    </svg>
  ),
  download: (
    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </svg>
  ),
}

// Sample funding rounds for the dashboard mockup (illustrative, not real data)
const MOCK_ROUNDS = [
  { company: 'Skylark AI', amount: '$24M', stage: 'Series A', location: 'San Francisco, CA', when: '2 min ago', industry: 'AI/ML', highlight: true },
  { company: 'Nimbus Climate', amount: '$8M', stage: 'Seed', location: 'Berlin, DE', when: '14 min ago', industry: 'Climate' },
  { company: 'Volta Robotics', amount: '$45M', stage: 'Series B', location: 'Boston, MA', when: '38 min ago', industry: 'Hardware' },
  { company: 'Pulse Health', amount: '$12M', stage: 'Series A', location: 'London, UK', when: '1h ago', industry: 'HealthTech' },
  { company: 'Ledger Forge', amount: '$3M', stage: 'Pre-seed', location: 'Singapore', when: '2h ago', industry: 'FinTech' },
]

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-900 text-white antialiased selection:bg-emerald-500/15">
      {/* ─────────────────── Nav ─────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            <span className="text-emerald-400">{c.nav.brandFunding}</span>
            <span className="text-white">{c.nav.brandScout}</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              {c.nav.loginLabel}
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-500"
            >
              {c.nav.signupLabel}
            </Link>
          </div>
        </div>
      </nav>

      {/* ─────────────────── Hero ─────────────────── */}
      <section className="relative overflow-hidden px-6 pt-24 pb-12 sm:pt-32 sm:pb-16">
        {/* Single soft glow */}
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[140px]" />

        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-balance text-5xl font-extrabold leading-[1.02] tracking-[-0.03em] text-white sm:text-6xl md:text-7xl lg:text-[5.5rem]">
            {c.hero.headline}
          </h1>

          <p className="mx-auto mt-7 max-w-xl text-balance text-lg leading-relaxed text-slate-400 sm:text-xl">
            {c.hero.subheadline}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={c.hero.primaryCtaHref}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-7 py-4 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)] transition-all hover:bg-emerald-500 hover:shadow-[0_12px_32px_-8px_rgba(16,185,129,0.6)] sm:w-auto"
            >
              {c.hero.primaryCta}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href={c.hero.secondaryCtaHref}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-7 py-4 text-base font-semibold text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-900/60 sm:w-auto"
            >
              {c.hero.secondaryCta}
            </Link>
          </div>
        </div>

      </section>

      {/* ─────────────────── Channel Screenshots (single row) ─────────────────── */}
      <section className="relative overflow-hidden px-6 pb-24 pt-8 sm:pb-32">
        <div className="mx-auto max-w-7xl">
          {/* Background glow */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

          {/* Single row on desktop, stacked on mobile */}
          <div className="flex flex-col items-center justify-center gap-10 lg:flex-row lg:items-end lg:gap-8">
            {/* SMS phone — left */}
            <div className="relative mx-auto w-full max-w-[260px] lg:mx-0 lg:w-auto">
              <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                SMS
              </p>
              <div className="relative rotate-[-2deg] transition-transform duration-500 hover:rotate-0">
                <div aria-hidden className="absolute -inset-2 rounded-[2.5rem] bg-emerald-500/20 blur-2xl" />
                <img
                  src={c.channels.items[0].src}
                  alt={c.channels.items[0].alt}
                  className="relative w-full rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-slate-800 lg:h-[480px] lg:w-auto"
                />
              </div>
            </div>

            {/* Slack desktop — middle, the wide one */}
            <div className="relative mx-auto w-full max-w-[600px] lg:mx-0 lg:w-auto">
              <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                Slack
              </p>
              <div className="relative rotate-[-0.5deg] transition-transform duration-500 hover:rotate-0">
                <div aria-hidden className="absolute -inset-3 rounded-[2rem] bg-emerald-500/15 blur-2xl" />
                <img
                  src={c.channels.items[2].src}
                  alt={c.channels.items[2].alt}
                  className="relative w-full rounded-2xl shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-slate-800 lg:h-[400px] lg:w-auto"
                />
              </div>
            </div>

            {/* Teams phone — right */}
            <div className="relative mx-auto w-full max-w-[260px] lg:mx-0 lg:w-auto">
              <p className="mb-4 text-center text-xs font-bold uppercase tracking-[0.2em] text-emerald-400">
                Teams
              </p>
              <div className="relative rotate-[2deg] transition-transform duration-500 hover:rotate-0">
                <div aria-hidden className="absolute -inset-2 rounded-[2.5rem] bg-emerald-500/20 blur-2xl" />
                <img
                  src={c.channels.items[1].src}
                  alt={c.channels.items[1].alt}
                  className="relative w-full rounded-[2rem] shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-slate-800 lg:h-[480px] lg:w-auto"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Logo bar ─────────────────── */}
      <section className="border-y border-slate-800 bg-slate-900/40 px-6 py-14">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {c.logos.label}
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-16">
            {c.logos.items.map((item) => (
              <span key={item} className="text-sm font-semibold text-slate-500">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── How it works ─────────────────── */}
      <section className="px-6 py-28 sm:py-36">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              {c.howItWorks.eyebrow}
            </p>
            <h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.02em] text-white sm:text-5xl md:text-6xl">
              {c.howItWorks.headline}
            </h2>
          </div>

          <div className="mt-20 grid gap-6 md:grid-cols-3">
            {c.howItWorks.steps.map((step) => (
              <div
                key={step.number}
                className="rounded-3xl bg-slate-900/40 p-8 transition-all hover:bg-slate-900/60"
              >
                <div className="text-5xl font-extrabold tracking-tight text-slate-600">{step.number}</div>
                <h3 className="mt-5 text-xl font-bold tracking-tight text-white">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── Features grid ─────────────────── */}
      <section id="features" className="bg-slate-900/40 px-6 py-28 sm:py-36">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              {c.features.eyebrow}
            </p>
            <h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.02em] text-white sm:text-5xl md:text-6xl">
              {c.features.headline}
            </h2>
          </div>

          <div className="mt-20 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.items.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-3xl bg-slate-900 p-7 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-black/40"
              >
                <div className="mb-5 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-800 text-slate-300 transition-all group-hover:bg-emerald-500/10 group-hover:text-emerald-400">
                  {ICONS[feature.icon] || ICONS.dashboard}
                </div>
                <h3 className="text-lg font-bold tracking-tight text-white">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── Dashboard preview callout ─────────────────── */}
      <section className="px-6 py-28 sm:py-36">
        <div className="mx-auto grid max-w-6xl items-center gap-16 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              {c.dashboardPreview.eyebrow}
            </p>
            <h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.02em] text-white sm:text-5xl">
              {c.dashboardPreview.headline}
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-slate-400">
              {c.dashboardPreview.description}
            </p>
            <Link
              href={c.dashboardPreview.ctaHref}
              className="mt-10 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-emerald-500"
            >
              {c.dashboardPreview.cta}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
          <div className="relative">
            <div className="absolute -inset-x-6 -inset-y-4 rounded-[2.5rem] bg-emerald-500/15 blur-3xl" aria-hidden />
            <div className="relative overflow-hidden rounded-3xl border border-slate-700/50 bg-slate-900 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.12)]">
              {/* Compact mockup — just the alert list */}
              <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/60 px-5 py-3.5">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Live alerts</div>
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Live
                </div>
              </div>
              <div className="divide-y divide-slate-800">
                {MOCK_ROUNDS.slice(0, 4).map((r, i) => (
                  <div
                    key={r.company}
                    className={`flex items-center justify-between px-5 py-4 ${
                      i === 0 ? 'animate-[fade-in-pulse_4s_ease-in-out_infinite] bg-emerald-500/5' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold text-slate-300">
                        {r.company[0]}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white">{r.company}</div>
                        <div className="text-xs text-slate-500">{r.stage} • {r.location}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-white">{r.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Pricing ─────────────────── */}
      <section id="pricing" className="bg-slate-900/40 px-6 py-28 sm:py-36">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              {c.pricing.eyebrow}
            </p>
            <h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.02em] text-white sm:text-5xl md:text-6xl">
              {c.pricing.headline}
            </h2>
            <p className="mt-5 text-lg text-slate-400">{c.pricing.subheadline}</p>
          </div>

          <div className="mt-20 grid gap-6 md:grid-cols-2">
            {c.pricing.plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-3xl p-9 ${
                  plan.recommended
                    ? 'bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-2xl shadow-emerald-500/20'
                    : 'bg-slate-900 shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)]'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3.5 py-1 text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-lg">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className={`text-base font-bold ${plan.recommended ? 'text-white' : 'text-white'}`}>{plan.name}</h3>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className={`text-6xl font-extrabold tracking-tight ${plan.recommended ? 'text-white' : 'text-white'}`}>{plan.price}</span>
                    <span className={plan.recommended ? 'text-slate-500' : 'text-slate-500'}>{plan.period}</span>
                  </div>
                  <p className={`mt-4 text-sm ${plan.recommended ? 'text-slate-600' : 'text-slate-400'}`}>{plan.description}</p>
                </div>

                <ul className="mt-8 flex flex-col gap-3.5 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      {feature.included ? (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg className={`mt-0.5 h-4 w-4 shrink-0 ${plan.recommended ? 'text-slate-300' : 'text-slate-600'}`} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={
                        feature.included
                          ? plan.recommended ? 'text-slate-100' : 'text-slate-300'
                          : plan.recommended ? 'text-slate-500' : 'text-slate-500'
                      }>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-10">
                  <Link
                    href={plan.ctaHref}
                    className={`block w-full rounded-full py-4 text-center text-sm font-semibold transition-all ${
                      plan.ctaStyle === 'primary'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 hover:shadow-xl hover:shadow-emerald-500/40'
                        : 'bg-slate-800 text-white hover:bg-slate-700'
                    }`}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── FAQ ─────────────────── */}
      <section className="px-6 py-28 sm:py-36">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              {c.faq.eyebrow}
            </p>
            <h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.02em] text-white sm:text-5xl">
              {c.faq.headline}
            </h2>
          </div>

          <div className="mt-16 space-y-2">
            {c.faq.items.map((item) => (
              <details
                key={item.question}
                className="group rounded-2xl bg-slate-900/40 px-6 py-5 transition-colors hover:bg-slate-900/60"
              >
                <summary className="flex cursor-pointer items-center justify-between text-base font-bold text-white marker:hidden [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <svg className="h-5 w-5 shrink-0 text-slate-500 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── Final CTA ─────────────────── */}
      <section className="px-6 pb-28 sm:pb-36">
        <div className="mx-auto max-w-5xl">
          <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 px-8 py-20 text-center ring-1 ring-slate-800 sm:px-16 sm:py-24">
            <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-[300px] w-[500px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
            <h2 className="text-balance text-4xl font-extrabold tracking-[-0.02em] text-white sm:text-5xl md:text-6xl">
              {c.finalCta.headline}
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg text-slate-400">
              {c.finalCta.subheadline}
            </p>
            <div className="mt-10">
              <Link
                href={c.finalCta.primaryCtaHref}
                className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-4 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)] transition-all hover:bg-emerald-500 hover:shadow-[0_12px_32px_-8px_rgba(16,185,129,0.6)]"
              >
                {c.finalCta.primaryCta}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Footer ─────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-900 px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link href="/" className="text-2xl font-extrabold tracking-tight">
                <span className="text-emerald-400">{c.nav.brandFunding}</span>
                <span className="text-white">{c.nav.brandScout}</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm text-slate-400">{c.footer.tagline}</p>
            </div>
            {c.footer.columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold uppercase tracking-[0.15em] text-slate-500">{col.title}</h4>
                <ul className="mt-5 space-y-3">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-400 transition-colors hover:text-white"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-slate-800 pt-8 sm:flex-row">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} {c.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
