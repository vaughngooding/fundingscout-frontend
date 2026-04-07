import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function ContactPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-white tracking-tight">Contact</h1>
        <p className="mt-2 text-base text-slate-400">
          Have a question, feature request, or feedback? Reach out directly — I read every message.
        </p>
      </div>

      {/* Contact methods */}
      <div className="grid gap-5 sm:grid-cols-2">
        {/* Text card */}
        <a
          href="sms:+14017142558"
          className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 p-7 transition-all hover:border-emerald-500/40 hover:bg-slate-800/60"
        >
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.184-4.183a1.14 1.14 0 01.778-.332 48.294 48.294 0 005.83-.498c1.585-.233 2.708-1.626 2.708-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Text me</h2>
          <p className="mt-1 text-sm text-slate-400">
            Yes. This is my real number. Text me with: a delayed or missing funding alert, a false funding alert, feature requests, questions, or just to say hi. I&apos;m listening (:
          </p>
          <div className="mt-5 flex items-center justify-between">
            <span className="font-mono text-sm font-semibold text-emerald-400">
              (401) 714-2558
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
              Open Messages
              <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </a>

        {/* Email card */}
        <a
          href="mailto:vaughn@vaughngooding.com?subject=FundingScout"
          className="group relative overflow-hidden rounded-2xl border border-slate-700/50 bg-slate-900 p-7 transition-all hover:border-emerald-500/40 hover:bg-slate-800/60"
        >
          <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
              />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Email me</h2>
          <p className="mt-1 text-sm text-slate-400">
            Better for collaboration, longer questions, or anything else.
          </p>
          <div className="mt-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-emerald-400 truncate">
              vaughn@vaughngooding.com
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-400 group-hover:text-white transition-colors">
              Open Email
              <svg className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </span>
          </div>
        </a>
      </div>

      {/* Footer note */}
      <p className="mt-10 text-center text-xs text-slate-500">
        Built by{' '}
        <a
          href="https://linkedin.com/in/VaughnGooding"
          target="_blank"
          rel="noopener noreferrer"
          className="text-slate-400 hover:text-white transition-colors"
        >
          Vaughn Gooding
        </a>
        .
      </p>
    </div>
  )
}
