import Link from 'next/link'
import { landingContent as c } from '@/content/landing'
import PricingSection from '@/components/PricingSection'

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
      <section className="relative overflow-hidden px-6 pt-12 pb-4 sm:pt-16 sm:pb-6">
        {/* Single soft glow */}
        <div aria-hidden className="pointer-events-none absolute -top-32 left-1/2 -z-10 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-emerald-500/15 blur-[140px]" />

        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-balance text-5xl font-extrabold leading-[1.02] tracking-[-0.03em] text-white sm:whitespace-nowrap sm:text-6xl md:text-7xl">
            {c.hero.headline}
          </h1>

          <p className="mx-auto mt-10 max-w-3xl text-base leading-relaxed text-slate-400 sm:text-lg md:whitespace-nowrap">
            {c.hero.subheadline}
          </p>

          <div className="mt-12 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href={c.hero.primaryCtaHref}
              className="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-600 px-7 py-4 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)] transition-all hover:bg-emerald-500 hover:shadow-[0_12px_32px_-8px_rgba(16,185,129,0.6)] sm:w-auto"
            >
              {c.hero.primaryCta}
              <svg className="h-4 w-4 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </Link>
            <a
              href={c.hero.secondaryCtaHref}
              className="inline-flex w-full items-center justify-center rounded-full border border-slate-700 bg-slate-900 px-7 py-4 text-base font-semibold text-slate-200 transition-all hover:border-slate-600 hover:bg-slate-900/60 sm:w-auto"
            >
              {c.hero.secondaryCta}
            </a>
          </div>
        </div>

      </section>

      {/* ─────────────────── Channel Screenshots (single row) ─────────────────── */}
      <section className="relative overflow-hidden px-6 pb-10 pt-2 sm:pb-14">
        <div className="mx-auto max-w-7xl">
          {/* Background glow */}
          <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[500px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500/10 blur-3xl" />

          {/* 3-column grid on mobile/tablet, switch to centered flex row on desktop */}
          <div className="grid grid-cols-3 items-end gap-3 sm:gap-5 lg:flex lg:justify-center lg:gap-8">
            {/* SMS phone — left */}
            <div className="relative mx-auto w-full lg:mx-0 lg:w-auto">
              <p className="mb-3 text-center text-base font-bold uppercase tracking-[0.15em] text-emerald-400 sm:text-xl sm:tracking-[0.2em] lg:mb-5 lg:text-2xl">
                SMS
              </p>
              <div className="relative transition-transform duration-500 hover:rotate-0 lg:rotate-[-2deg]">
                <div aria-hidden className="absolute -inset-2 rounded-[2.5rem] bg-emerald-500/20 blur-2xl" />
                <img
                  src={c.channels.items[0].src}
                  alt={c.channels.items[0].alt}
                  className="relative w-full rounded-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-slate-800 sm:rounded-2xl lg:h-[480px] lg:w-auto lg:rounded-[2rem]"
                />
              </div>
            </div>

            {/* Slack phone — middle */}
            <div className="relative mx-auto w-full lg:mx-0 lg:w-auto">
              <p className="mb-3 text-center text-base font-bold uppercase tracking-[0.15em] text-emerald-400 sm:text-xl sm:tracking-[0.2em] lg:mb-5 lg:text-2xl">
                Slack
              </p>
              <div className="relative transition-transform duration-500 hover:rotate-0 lg:rotate-[-0.5deg]">
                <div aria-hidden className="absolute -inset-2 rounded-[2.5rem] bg-emerald-500/20 blur-2xl" />
                <img
                  src={c.channels.items[2].src}
                  alt={c.channels.items[2].alt}
                  className="relative w-full rounded-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-slate-800 sm:rounded-2xl lg:h-[480px] lg:w-auto lg:rounded-[2rem]"
                />
              </div>
            </div>

            {/* Teams phone — right */}
            <div className="relative mx-auto w-full lg:mx-0 lg:w-auto">
              <p className="mb-3 text-center text-base font-bold uppercase tracking-[0.15em] text-emerald-400 sm:text-xl sm:tracking-[0.2em] lg:mb-5 lg:text-2xl">
                Teams
              </p>
              <div className="relative transition-transform duration-500 hover:rotate-0 lg:rotate-[2deg]">
                <div aria-hidden className="absolute -inset-2 rounded-[2.5rem] bg-emerald-500/20 blur-2xl" />
                <img
                  src={c.channels.items[1].src}
                  alt={c.channels.items[1].alt}
                  className="relative w-full rounded-xl shadow-[0_20px_60px_-20px_rgba(0,0,0,0.7)] ring-1 ring-slate-800 sm:rounded-2xl lg:h-[480px] lg:w-auto lg:rounded-[2rem]"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Dashboard preview callout ─────────────────── */}
      <section className="px-6 py-14 sm:py-20">
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

      {/* ─────────────────── Competitor comparison ─────────────────── */}
      <section className="px-6 py-14 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400">
              {c.comparison.eyebrow}
            </p>
            <h2 className="mt-4 text-balance text-4xl font-extrabold tracking-[-0.02em] text-white sm:text-5xl">
              {c.comparison.headline}
            </h2>
          </div>

          <div className="mt-12 overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 sm:mt-16">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  {c.comparison.columns.map((col, i) => (
                    <th
                      key={col}
                      className={`px-4 py-4 text-xs font-bold uppercase tracking-[0.1em] text-slate-500 ${
                        i === 0 ? 'text-left' : 'text-center'
                      }`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {c.comparison.rows.map((row) => (
                  <tr
                    key={row.tool}
                    className={`border-b border-slate-800/60 last:border-b-0 transition-colors ${
                      row.highlight
                        ? 'bg-emerald-500/10 hover:bg-emerald-500/15'
                        : 'hover:bg-slate-900'
                    }`}
                  >
                    <td
                      className={`px-4 py-4 font-semibold ${
                        row.highlight ? 'text-emerald-300' : 'text-white'
                      }`}
                    >
                      {row.tool}
                    </td>
                    {row.cells.map((cell, idx) => (
                      <td key={idx} className="px-4 py-4 text-center">
                        {cell.tone === 'good' && (
                          <span className="inline-block rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-500/30">
                            {cell.label}
                          </span>
                        )}
                        {cell.tone === 'bad' && (
                          <span className="inline-block rounded-full bg-red-500/15 px-3 py-1 text-xs font-semibold text-red-300 ring-1 ring-red-500/30">
                            {cell.label}
                          </span>
                        )}
                        {cell.tone === 'medium' && (
                          <span className="inline-block rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-300 ring-1 ring-amber-500/30">
                            {cell.label}
                          </span>
                        )}
                        {cell.tone === 'price-highlight' && (
                          <span className="text-base font-extrabold text-emerald-300">{cell.label}</span>
                        )}
                        {cell.tone === 'price' && (
                          <span className="text-sm font-semibold text-white">{cell.label}</span>
                        )}
                        {cell.tone === 'price-free' && (
                          <span className="text-sm font-medium text-slate-400">{cell.label}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─────────────────── Pricing ─────────────────── */}
      <PricingSection />

      {/* ─────────────────── FAQ ─────────────────── */}
      <section className="px-6 py-14 sm:py-20">
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
