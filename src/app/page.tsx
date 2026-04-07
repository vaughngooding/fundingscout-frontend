import Link from "next/link";
import { Suspense } from "react";
import FundingPreview from "@/components/FundingPreview";

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* ───────────────────────── Nav ───────────────────────── */}
      <nav className="fixed top-0 z-50 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight">
            <span className="text-blue-500">Funding</span>Scout
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-300 transition-colors hover:text-white"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold transition-colors hover:bg-blue-500"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </nav>

      {/* ───────────────────────── Hero ───────────────────────── */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-20">
        {/* Gradient background decoration */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-0 h-[600px] w-[800px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/10 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-[400px] w-[600px] translate-x-1/4 translate-y-1/4 rounded-full bg-blue-500/5 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900 px-4 py-1.5 text-sm text-slate-300">
            <span className="inline-block h-2 w-2 rounded-full bg-blue-500" />
            Trusted by 500+ B2B sales teams
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
            Never Miss a{" "}
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Funding Signal
            </span>{" "}
            Again
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-slate-400 sm:text-xl">
            AI-powered alerts deliver fresh funding rounds to your inbox every
            morning. Know who just raised before your competitors do.
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/25 sm:w-auto"
            >
              Start Free
            </Link>
            <a
              href="#how-it-works"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-8 py-3.5 text-base font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white sm:w-auto"
            >
              See How It Works
            </a>
          </div>

          <p className="mt-6 text-sm text-slate-500">
            No credit card required. Free plan available forever.
          </p>
        </div>
      </section>

      {/* ─────────────────── How It Works ─────────────────── */}
      <section id="how-it-works" className="border-t border-slate-800 bg-slate-900 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
              How It Works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              From signal to pipeline in three steps
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              FundingScout scans the web 24/7 so you can focus on selling, not
              searching.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Step 1 */}
            <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 text-xl font-bold text-blue-500">
                1
              </div>
              <h3 className="text-lg font-semibold">We Monitor 12+ Sources</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                RSS feeds from TechCrunch, Crunchbase, FinSMEs, EU-Startups,
                VentureBeat, and more &mdash; aggregated and deduplicated
                automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 text-xl font-bold text-blue-500">
                2
              </div>
              <h3 className="text-lg font-semibold">AI Reads Every Article</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                AI extracts the company name, funding amount, round
                stage, lead investors, and headquarters location from every
                article &mdash; no manual work required.
              </p>
            </div>

            {/* Step 3 */}
            <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-8">
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600/10 text-xl font-bold text-blue-500">
                3
              </div>
              <h3 className="text-lg font-semibold">You Get Matched Alerts</h3>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Set your preferences &mdash; industry, stage, geography,
                minimum raise &mdash; and receive only the funding rounds that
                matter to you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Live Preview ─────────────────── */}
      <Suspense fallback={
        <section className="border-t border-slate-800 px-6 py-24">
          <div className="mx-auto max-w-6xl text-center">
            <div className="h-8 w-48 mx-auto rounded bg-slate-800 animate-pulse" />
            <div className="mt-10 h-64 rounded-xl bg-slate-800/50 animate-pulse" />
          </div>
        </section>
      }>
        <FundingPreview />
      </Suspense>

      {/* ─────────────────── Features ─────────────────── */}
      <section id="features" className="border-t border-slate-800 px-6 py-24">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything you need to act on funding signals
            </h2>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {/* Feature 1 */}
            <div className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-700">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h3 className="font-semibold">Daily Email Digest</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                A curated summary of fresh funding rounds delivered to your
                inbox every morning at 8 AM.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-700">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
                </svg>
              </div>
              <h3 className="font-semibold">Web Dashboard</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Browse, search, and filter every funding round in a clean,
                fast dashboard built for prospecting.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-700">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
              </div>
              <h3 className="font-semibold">Custom Filters</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Narrow by industry, funding stage, amount raised, and
                geography to see only the signals you care about.
              </p>
            </div>

            {/* Feature 4 — Pro */}
            <div className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-700">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                </div>
                <span className="rounded-full bg-blue-600/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                  Pro
                </span>
              </div>
              <h3 className="font-semibold">Instant Alerts</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Get funding alerts the moment they break &mdash; pushed
                instantly to Slack, Telegram, or webhooks. No waiting for
                a daily digest.
              </p>
            </div>

            {/* Feature 5 — Pro */}
            <div className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-700">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
                  </svg>
                </div>
                <span className="rounded-full bg-blue-600/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                  Pro
                </span>
              </div>
              <h3 className="font-semibold">Bookmarks &amp; Notes</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Save promising leads and annotate them with notes so your
                entire team stays aligned on outreach.
              </p>
            </div>

            {/* Feature 6 — Pro */}
            <div className="group rounded-xl border border-slate-800 bg-slate-900 p-6 transition-colors hover:border-slate-700">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600/10">
                  <svg className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                </div>
                <span className="rounded-full bg-blue-600/10 px-2.5 py-0.5 text-xs font-semibold text-blue-400">
                  Pro
                </span>
              </div>
              <h3 className="font-semibold">CSV Export</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Export any filtered list of funding rounds to CSV and import
                directly into your CRM or outreach tool.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── Pricing ─────────────────── */}
      <section id="pricing" className="border-t border-slate-800 bg-slate-900 px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-blue-500">
              Pricing
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Simple, transparent pricing
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-slate-400">
              Start for free and upgrade when you need more power.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-2">
            {/* Free Plan */}
            <div className="flex flex-col rounded-xl border border-slate-800 bg-slate-950 p-8">
              <div>
                <h3 className="text-lg font-semibold">Free</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">$0</span>
                  <span className="text-slate-500">/mo</span>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  Perfect for getting started and evaluating funding signals.
                </p>
              </div>

              <ul className="mt-8 flex flex-col gap-4 text-sm">
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300">3 alerts per day</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300">Daily email digest</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300">Web dashboard (view only)</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-slate-600">No instant alerts</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-slate-600">No bookmarks or notes</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-slate-700" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <span className="text-slate-600">No CSV export</span>
                </li>
              </ul>

              <div className="mt-auto pt-8">
                <Link
                  href="/signup"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-900 py-3 text-center text-sm font-semibold text-slate-300 transition-colors hover:border-slate-600 hover:text-white"
                >
                  Start Free
                </Link>
              </div>
            </div>

            {/* Pro Plan */}
            <div className="relative flex flex-col rounded-xl border-2 border-blue-600 bg-slate-950 p-8">
              <div className="absolute -top-3.5 left-6 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold">
                Most Popular
              </div>

              <div>
                <h3 className="text-lg font-semibold">Pro</h3>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">$49</span>
                  <span className="text-slate-500">/mo</span>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  For reps and teams ready to turn signals into revenue.
                </p>
              </div>

              <ul className="mt-8 flex flex-col gap-4 text-sm">
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300">
                    <strong className="text-white">Unlimited</strong> alerts
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300">Daily email digest</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300">
                    <strong className="text-white">Full</strong> web dashboard
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300">
                    <strong className="text-white">Instant</strong> Slack, Telegram &amp; webhook alerts
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300">Bookmarks &amp; notes</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300">CSV export</span>
                </li>
                <li className="flex items-start gap-3">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  <span className="text-slate-300">
                    <strong className="text-white">Unlimited</strong> history
                  </span>
                </li>
              </ul>

              <div className="mt-auto pt-8">
                <Link
                  href="/signup?plan=pro"
                  className="block w-full rounded-lg bg-blue-600 py-3 text-center text-sm font-semibold transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/25"
                >
                  Go Pro
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────────── CTA Banner ─────────────────── */}
      <section className="border-t border-slate-800 px-6 py-24">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to find your next customer?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-slate-400">
            Join hundreds of sales reps who start their morning with
            FundingScout. Set up takes less than 2 minutes.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/signup"
              className="w-full rounded-lg bg-blue-600 px-8 py-3.5 text-base font-semibold transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-600/25 sm:w-auto"
            >
              Start Free
            </Link>
          </div>
        </div>
      </section>

      {/* ─────────────────── Footer ─────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-950 px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-sm text-slate-500 sm:flex-row">
          <p>
            &copy; {new Date().getFullYear()} FundingScout. All rights
            reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/login"
              className="transition-colors hover:text-slate-300"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="transition-colors hover:text-slate-300"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
