import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — FundingScout',
  description:
    'How FundingScout collects, uses, stores, and protects your personal information including phone numbers used for SMS notifications.',
}

const LAST_UPDATED = 'April 7, 2026'

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white antialiased">
      {/* Nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            <span className="text-emerald-400">Funding</span>
            <span className="text-white">Scout</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-500"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Content */}
      <article className="px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: {LAST_UPDATED}</p>

          <div className="prose prose-invert mt-10 max-w-none space-y-8">
            <section>
              <p className="text-base leading-relaxed text-slate-300">
                FundingScout (&ldquo;we,&rdquo; &ldquo;us,&rdquo; or &ldquo;our&rdquo;)
                provides real-time startup funding alerts via web dashboard, email,
                Slack, Telegram, and SMS. This Privacy Policy explains what information
                we collect, how we use it, and the choices you have. By creating an
                account or using FundingScout, you agree to the practices described
                below.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Information we collect
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                We collect only the information needed to operate the service:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-400">
                <li>
                  <strong className="text-slate-300">Account information.</strong>{' '}
                  Email address and password (hashed) when you sign up. Optional name
                  and company name.
                </li>
                <li>
                  <strong className="text-slate-300">Alert preferences.</strong> The
                  filters you save (industry, funding stage, geography, deal size) so
                  we know what alerts to send you.
                </li>
                <li>
                  <strong className="text-slate-300">Phone number.</strong> Only if you
                  choose to enable SMS notifications. Stored solely to deliver alerts
                  you have explicitly requested. See &ldquo;SMS data handling&rdquo;
                  below.
                </li>
                <li>
                  <strong className="text-slate-300">Integration credentials.</strong>{' '}
                  If you connect Slack, Telegram, or web push notifications, we store
                  the minimum tokens or chat identifiers needed to deliver your alerts.
                </li>
                <li>
                  <strong className="text-slate-300">Payment information.</strong> If
                  you upgrade to Pro, payment is processed by Stripe. We never see or
                  store your card number; Stripe holds it. We store your Stripe customer
                  ID so we know which account is on Pro.
                </li>
                <li>
                  <strong className="text-slate-300">Usage data.</strong> Standard
                  server logs (IP address, browser, request timestamps) for
                  reliability, security, and abuse prevention.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                SMS data handling
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Your phone number, if you provide one, is treated with stricter
                protections than other account data:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-400">
                <li>
                  We collect your phone number{' '}
                  <strong className="text-slate-300">only</strong> after you explicitly
                  enter it on the Settings page and complete a one-time SMS verification
                  challenge.
                </li>
                <li>
                  We use your phone number{' '}
                  <strong className="text-slate-300">only</strong> to deliver SMS
                  notifications about funding rounds matching your saved alert filters,
                  and to send a one-time verification code at the moment of opt-in.
                </li>
                <li>
                  We{' '}
                  <strong className="text-slate-300">never</strong> sell, rent, lease,
                  or otherwise share your phone number with third-party advertisers,
                  marketers, data brokers, or affiliates for any purpose.
                </li>
                <li>
                  Your phone number is shared only with our SMS delivery sub-processor
                  (Twilio Inc.) for the sole purpose of transmitting the alerts you
                  have requested. Twilio is bound by its own privacy commitments,
                  available at{' '}
                  <a
                    href="https://www.twilio.com/legal/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-emerald-400 underline-offset-2 hover:underline"
                  >
                    twilio.com/legal/privacy
                  </a>
                  .
                </li>
                <li>
                  You can remove your phone number at any time from Settings → Phone
                  Notifications, or by replying{' '}
                  <span className="font-mono text-slate-200">STOP</span> to any SMS
                  alert. Removal is immediate.
                </li>
                <li>
                  We retain your phone number only for as long as your account is
                  active and SMS notifications are enabled. If you disable SMS or
                  delete your account, we delete your phone number from our active
                  database within 30 days.
                </li>
                <li>
                  Phone numbers and SMS opt-in consent records are{' '}
                  <strong className="text-slate-300">never</strong> shared with third
                  parties for marketing purposes, and are not used to build advertising
                  profiles.
                </li>
              </ul>
              <p className="mt-4 text-sm leading-relaxed text-slate-400">
                For full details on the SMS opt-in flow, message frequency, sample
                messages, and how to unsubscribe, see our{' '}
                <Link
                  href="/sms"
                  className="text-emerald-400 underline-offset-2 hover:underline"
                >
                  SMS Alerts page
                </Link>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                How we use your information
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-400">
                <li>To create and authenticate your account.</li>
                <li>
                  To match new funding announcements against your saved alert filters
                  and deliver matched alerts via the channels you have configured.
                </li>
                <li>
                  To communicate operationally about your account (billing, security,
                  service updates).
                </li>
                <li>To prevent abuse, debug issues, and improve reliability.</li>
              </ul>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                We do not use your data for behavioral advertising. We do not sell your
                personal information.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Sub-processors
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                We use a small set of trusted infrastructure providers to operate
                FundingScout:
              </p>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-400">
                <li>
                  <strong className="text-slate-300">Supabase</strong> — database, auth,
                  and edge functions.
                </li>
                <li>
                  <strong className="text-slate-300">Vercel</strong> — web application
                  hosting and edge serving.
                </li>
                <li>
                  <strong className="text-slate-300">Stripe</strong> — payment
                  processing for Pro subscriptions.
                </li>
                <li>
                  <strong className="text-slate-300">Twilio</strong> — SMS delivery
                  (only for users who have opted in to SMS alerts).
                </li>
                <li>
                  <strong className="text-slate-300">Resend</strong> — transactional
                  email delivery (account confirmations, daily digests).
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Your choices
              </h2>
              <ul className="mt-3 list-disc space-y-2 pl-6 text-sm text-slate-400">
                <li>
                  <strong className="text-slate-300">Update or delete data.</strong> You
                  can update most of your data from Settings, or email us to request
                  deletion of your account.
                </li>
                <li>
                  <strong className="text-slate-300">Disable SMS.</strong> Reply STOP
                  to any alert, or remove your phone number from Settings.
                </li>
                <li>
                  <strong className="text-slate-300">Disable email digests.</strong>{' '}
                  From Settings, or via the unsubscribe link in any email.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-bold tracking-tight text-white">Contact</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Questions about this policy or your data? Email{' '}
                <a
                  href="mailto:support@fundingscout.io"
                  className="text-emerald-400 underline-offset-2 hover:underline"
                >
                  support@fundingscout.io
                </a>
                .
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-bold tracking-tight text-white">
                Changes to this policy
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                We may update this policy as the service evolves. The &ldquo;Last
                updated&rdquo; date at the top of this page reflects the most recent
                revision. Material changes will be communicated via email to active
                users.
              </p>
            </section>
          </div>
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900 px-6 py-12">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="text-xs text-slate-500">
            &copy; {new Date().getFullYear()} FundingScout. All rights reserved.
          </p>
          <div className="flex gap-5 text-xs text-slate-500">
            <Link href="/" className="hover:text-white">Home</Link>
            <Link href="/sms" className="hover:text-white">SMS Alerts</Link>
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
