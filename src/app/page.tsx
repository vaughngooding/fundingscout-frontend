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
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      {/* ─────────────────── Nav ─────────────────── */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-emerald-600">{c.nav.brandFunding}</span>
            <span className="text-slate-900">{c.nav.brandScout}</span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
            >
              {c.nav.loginLabel}
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 hover:shadow-md"
            >
              {c.nav.signupLabel}
            </Link>
          </div>
        </div>
      </nav>

      {/* ─────────────────── Hero ─────────────────── */}
      <section className="relative overflow-hidden px-6 pt-20 pb-16 sm:pt-28 sm:pb-24">
        {/* Soft gradient background */}
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[600px] bg-gradient-to-b from-emerald-50 via-blue-50/40 to-transparent" />
        <div aria-hidden className="pointer-events-none absolute -top-20 left-1/2 -z-10 h-[420px] w-[820px] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-[120px]" />

        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/80 px-4 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm backdrop-blur">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {c.hero.eyebrow}
          </div>

          <h1 className="text-balance text-4xl font-bold leading-[1.05] tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-7xl">
            {c.hero.headline.split('\n').map((line, i) => (
              <span key={i} className="block">{line}</span>
            ))}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-relaxed text-slate-600 sm:text-lg">
            {c.hero.subheadline}
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={c.hero.primaryCtaHref}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-slate-900/20 transition-all hover:bg-slate-800 hover:shadow-xl hover:shadow-slate-900/25 sm:w-auto"
            >
              {c.hero.primaryCta}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <Link
              href={c.hero.secondaryCtaHref}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-base font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-slate-50 sm:w-auto"
            >
              {c.hero.secondaryCta}
            </Link>
          </div>

          <p className="mt-6 text-xs font-medium text-slate-500">{c.hero.socialProof}</p>
        </div>

        {/* Dashboard preview mockup */}
        <div className="relative mx-auto mt-16 max-w-5xl px-2 sm:mt-20">
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-200/40 via-blue-200/30 to-purple-200/30 blur-2xl" aria-hidden />
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10">
            {/* Mockup top bar (browser chrome) */}
            <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-3">
              <div className="flex gap-1.5">
                <div className="h-3 w-3 rounded-full bg-rose-300" />
                <div className="h-3 w-3 rounded-full bg-amber-300" />
                <div className="h-3 w-3 rounded-full bg-emerald-300" />
              </div>
              <div className="ml-3 flex-1 rounded-md bg-white px-3 py-1 text-xs text-slate-400 shadow-inner">
                fundingscout.io/dashboard
              </div>
            </div>

            {/* Mockup body — fake dashboard content */}
            <div className="grid grid-cols-1 gap-0 md:grid-cols-[200px_1fr]">
              {/* Sidebar */}
              <aside className="hidden border-r border-slate-100 bg-slate-50/50 p-4 md:block">
                <div className="mb-4 text-[10px] font-bold uppercase tracking-wider text-slate-400">Filters</div>
                <div className="space-y-2 text-xs">
                  <div className="rounded-md bg-white px-2.5 py-1.5 font-semibold text-slate-700 shadow-sm">All rounds</div>
                  <div className="px-2.5 py-1.5 text-slate-500">Series A+</div>
                  <div className="px-2.5 py-1.5 text-slate-500">$10M+</div>
                  <div className="px-2.5 py-1.5 text-slate-500">AI/ML</div>
                  <div className="px-2.5 py-1.5 text-slate-500">Bookmarked</div>
                </div>
                <div className="mt-6 mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-400">Geography</div>
                <div className="space-y-2 text-xs">
                  <div className="px-2.5 py-1 text-slate-500">United States</div>
                  <div className="px-2.5 py-1 text-slate-500">Europe</div>
                  <div className="px-2.5 py-1 text-slate-500">Asia</div>
                </div>
              </aside>

              {/* Main feed */}
              <div className="p-4 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-slate-900">Today&apos;s funding rounds</div>
                    <div className="text-xs text-slate-500">{MOCK_ROUNDS.length} new since 9:00 AM</div>
                  </div>
                  <div className="hidden gap-2 sm:flex">
                    <div className="rounded-md border border-slate-200 px-2.5 py-1 text-xs text-slate-600">Sort: Newest</div>
                    <div className="rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">Live</div>
                  </div>
                </div>
                <div className="space-y-2">
                  {MOCK_ROUNDS.map((r) => (
                    <div
                      key={r.company}
                      className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                        r.highlight ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100 bg-white hover:border-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`flex h-9 w-9 items-center justify-center rounded-md text-xs font-bold ${
                          r.highlight ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {r.company[0]}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-slate-900">{r.company}</div>
                          <div className="text-[11px] text-slate-500">{r.location} • {r.industry}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-bold text-slate-900">{r.amount}</div>
                          <div className="text-[11px] text-slate-500">{r.stage}</div>
                        </div>
                        <div className="hidden text-[11px] text-slate-400 sm:block">{r.when}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Logo bar ─────────────────── */}
      <section className="border-y border-slate-100 bg-slate-50/50 px-6 py-12">
        <div className="mx-auto max-w-6xl">
          <p className="text-center text-xs font-semibold uppercase tracking-widest text-slate-500">
            {c.logos.label}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:gap-x-14">
            {c.logos.items.map((item) => (
              <span key={item} className="text-sm font-semibold text-slate-400">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── How it works ─────────────────── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              {c.howItWorks.eyebrow}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              {c.howItWorks.headline}
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {c.howItWorks.steps.map((step) => (
              <div
                key={step.number}
                className="relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:border-slate-300 hover:shadow-md"
              >
                <div className="text-5xl font-extrabold text-emerald-200">{step.number}</div>
                <h3 className="mt-4 text-lg font-bold text-slate-900">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── Features grid ─────────────────── */}
      <section id="features" className="bg-slate-50 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              {c.features.eyebrow}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              {c.features.headline}
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {c.features.items.map((feature) => (
              <div
                key={feature.title}
                className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg hover:shadow-emerald-500/5"
              >
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 transition-colors group-hover:bg-emerald-500 group-hover:text-white">
                  {ICONS[feature.icon] || ICONS.dashboard}
                </div>
                <h3 className="text-base font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── Dashboard preview callout ─────────────────── */}
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              {c.dashboardPreview.eyebrow}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              {c.dashboardPreview.headline}
            </h2>
            <p className="mt-5 text-base leading-relaxed text-slate-600">
              {c.dashboardPreview.description}
            </p>
            <Link
              href={c.dashboardPreview.ctaHref}
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-md transition-all hover:bg-slate-800"
            >
              {c.dashboardPreview.cta}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-emerald-200/30 to-blue-200/30 blur-xl" aria-hidden />
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              {/* Compact mockup — just the alert list */}
              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Live alerts</div>
              </div>
              <div className="divide-y divide-slate-100">
                {MOCK_ROUNDS.slice(0, 4).map((r) => (
                  <div key={r.company} className="flex items-center justify-between px-4 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-xs font-bold text-emerald-700">
                        {r.company[0]}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{r.company}</div>
                        <div className="text-xs text-slate-500">{r.stage} • {r.location}</div>
                      </div>
                    </div>
                    <div className="text-sm font-bold text-slate-900">{r.amount}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Pricing ─────────────────── */}
      <section id="pricing" className="bg-slate-50 px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-5xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              {c.pricing.eyebrow}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
              {c.pricing.headline}
            </h2>
            <p className="mt-4 text-base text-slate-600">{c.pricing.subheadline}</p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {c.pricing.plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-8 ${
                  plan.recommended
                    ? 'border-2 border-emerald-500 bg-white shadow-2xl shadow-emerald-500/10'
                    : 'border-slate-200 bg-white shadow-sm'
                }`}
              >
                {plan.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className="text-5xl font-extrabold text-slate-900">{plan.price}</span>
                    <span className="text-slate-500">{plan.period}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{plan.description}</p>
                </div>

                <ul className="mt-8 flex flex-col gap-3.5 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature.text} className="flex items-start gap-3">
                      {feature.included ? (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      ) : (
                        <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-300" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                      <span className={feature.included ? 'text-slate-700' : 'text-slate-400'}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto pt-8">
                  <Link
                    href={plan.ctaHref}
                    className={`block w-full rounded-xl py-3.5 text-center text-sm font-semibold transition-all ${
                      plan.ctaStyle === 'primary'
                        ? 'bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40'
                        : 'border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
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
      <section className="px-6 py-24 sm:py-32">
        <div className="mx-auto max-w-3xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-emerald-600">
              {c.faq.eyebrow}
            </p>
            <h2 className="mt-3 text-balance text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {c.faq.headline}
            </h2>
          </div>

          <div className="mt-12 space-y-3">
            {c.faq.items.map((item) => (
              <details
                key={item.question}
                className="group rounded-xl border border-slate-200 bg-white px-6 py-4 transition-colors hover:border-slate-300"
              >
                <summary className="flex cursor-pointer items-center justify-between text-base font-semibold text-slate-900 marker:hidden [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <svg className="h-5 w-5 shrink-0 text-slate-400 transition-transform group-open:rotate-180" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ─────────────────── Final CTA ─────────────────── */}
      <section className="relative overflow-hidden px-6 py-24 sm:py-32">
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900" />
        <div aria-hidden className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-3xl" />
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl">
            {c.finalCta.headline}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-balance text-base text-slate-300">
            {c.finalCta.subheadline}
          </p>
          <div className="mt-10">
            <Link
              href={c.finalCta.primaryCtaHref}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-semibold text-slate-900 shadow-2xl transition-all hover:bg-slate-50"
            >
              {c.finalCta.primaryCta}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────── Footer ─────────────────── */}
      <footer className="border-t border-slate-200 bg-white px-6 py-16">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-10 md:grid-cols-4">
            <div className="md:col-span-2">
              <Link href="/" className="text-2xl font-bold tracking-tight">
                <span className="text-emerald-600">{c.nav.brandFunding}</span>
                <span className="text-slate-900">{c.nav.brandScout}</span>
              </Link>
              <p className="mt-3 max-w-sm text-sm text-slate-600">{c.footer.tagline}</p>
            </div>
            {c.footer.columns.map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">{col.title}</h4>
                <ul className="mt-4 space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-sm text-slate-600 transition-colors hover:text-slate-900"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-slate-200 pt-8 sm:flex-row">
            <p className="text-xs text-slate-500">
              &copy; {new Date().getFullYear()} {c.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
