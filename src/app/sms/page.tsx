import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SMS Alerts — FundingScout',
  description:
    'How to opt in to FundingScout SMS funding alerts, what messages you will receive, and how to unsubscribe.',
}

export default function SmsOptInPage() {
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

      {/* Hero */}
      <section className="px-6 pt-16 pb-8">
        <div className="mx-auto max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
            SMS Notifications
          </p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Real-time funding alerts via SMS
          </h1>
          <p className="mt-6 text-lg leading-relaxed text-slate-400">
            FundingScout sends short, plain-text SMS messages directly to your phone the
            moment a startup raises capital that matches your saved alert filters
            (industry, funding stage, deal size, geography).
          </p>
        </div>
      </section>

      {/* How opt-in works */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">How to opt in</h2>
          <p className="mt-3 text-sm text-slate-400">
            Opt-in is a double-confirmation flow that requires both your active sign-up
            and SMS-based verification of your phone number. You will not receive any
            SMS until you complete both steps.
          </p>

          <ol className="mt-8 space-y-6">
            <li className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
                1
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Create a FundingScout account
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Sign up for free at{' '}
                  <Link
                    href="/signup"
                    className="text-emerald-400 underline-offset-2 hover:underline"
                  >
                    fundingscout.io/signup
                  </Link>{' '}
                  using your email address.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
                2
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Enter your phone number and consent to SMS
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Once signed in, navigate to{' '}
                  <span className="font-mono text-slate-300">Settings → Phone Notifications</span>{' '}
                  and enter your mobile number. Before you can proceed, you must read the
                  consent disclosure and check the box confirming:
                </p>
                {/* Replica of the actual opt-in form users see */}
                <div className="mt-4 rounded-lg border border-slate-600 bg-slate-800/50 p-4">
                  <p className="text-sm text-slate-300 mb-3">
                    By checking the box below and clicking &quot;Send Code,&quot; I agree to receive
                    recurring automated SMS text messages from FundingScout containing
                    real-time funding alerts matching my saved filters. Up to 10 messages
                    per day. Message and data rates may apply. Consent is not a condition
                    of any purchase. Reply STOP at any time to unsubscribe, or HELP for
                    help.
                  </p>
                  <label className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      disabled
                      className="w-4 h-4 mt-0.5 rounded border-slate-600 bg-slate-700"
                    />
                    <span className="text-sm text-white font-medium">
                      I agree to receive SMS text messages from FundingScout
                    </span>
                  </label>
                </div>
                <p className="mt-3 text-sm text-slate-400">
                  The &quot;Send Code&quot; button remains disabled until you check the consent
                  checkbox. You must explicitly type your number — we never auto-fill or
                  pull it from any other source.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
                3
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Confirm via SMS verification code
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Click <span className="font-mono text-slate-300">Send Code</span>. We
                  send a one-time 6-digit verification code to the number you entered
                  via Twilio Verify. Enter that code on the same Settings page to
                  confirm ownership of the phone. Your number is not marked as opted-in
                  until this verification succeeds.
                </p>
              </div>
            </li>

            <li className="flex gap-4">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-sm font-bold text-emerald-300">
                4
              </span>
              <div>
                <h3 className="text-base font-semibold text-white">
                  Receive funding alerts
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  After verification, you will begin receiving SMS notifications about
                  new startup funding rounds matching your saved alert filters. Each
                  message is short, plain-text, and includes a link to the source
                  article.
                </p>
              </div>
            </li>
          </ol>
        </div>
      </section>

      {/* Sample message */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Sample message</h2>
          <p className="mt-3 text-sm text-slate-400">
            Every FundingScout SMS follows the same short format. Here is a real
            example of what an alert looks like on your phone:
          </p>
          <div className="mt-6 rounded-2xl border border-slate-700 bg-slate-800 p-6">
            <p className="font-mono text-sm text-slate-200">
              FundingScout: HexemBio raised $10.4M (seed). https://www.finsmes.com/2026/04/hexembio-raises-10-4m-in-seed-funding/
            </p>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            From short code or toll-free number — sender ID may vary by carrier.
          </p>
        </div>
      </section>

      {/* Required disclosures */}
      <section className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Disclosures &amp; consent</h2>

          <div className="mt-6 space-y-5 rounded-2xl border border-slate-700 bg-slate-800/60 p-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                What you are agreeing to
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                By completing the phone verification flow described above, you expressly
                consent to receive recurring automated SMS notifications from FundingScout
                about startup funding rounds that match the alert filters you save in your
                account. Consent is not a condition of any purchase. You may set, change,
                or remove your alert filters at any time from your Settings page.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Message frequency
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Up to 10 messages per day, depending on the breadth of your saved alert
                filters and how many funding rounds match each day. Most users receive
                fewer than 5 messages per day.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Carrier rates
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Message and data rates may apply. FundingScout does not charge you a
                per-message fee, but your mobile carrier may. Check with your carrier for
                pricing on SMS and data services if you are unsure.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                How to stop messages
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Reply <span className="font-mono text-slate-200">STOP</span> to any
                FundingScout message at any time to immediately and permanently
                unsubscribe from SMS notifications. You will receive a single
                confirmation message and then no further messages. You can also disable
                SMS notifications by signing into your account, navigating to Settings →
                Phone Notifications, and removing your verified phone number.
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                How to get help
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Reply <span className="font-mono text-slate-200">HELP</span> to any
                FundingScout message to receive support contact information. Or email us
                directly at{' '}
                <a
                  href="mailto:support@fundingscout.io"
                  className="text-emerald-400 underline-offset-2 hover:underline"
                >
                  support@fundingscout.io
                </a>
                .
              </p>
            </div>

            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-300">
                Privacy
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Your phone number is stored only to deliver alerts you have requested
                and is never sold, rented, shared with advertisers, or used for any
                purpose other than the SMS notification service described on this page.
                See our{' '}
                <Link
                  href="/privacy"
                  className="text-emerald-400 underline-offset-2 hover:underline"
                >
                  Privacy Policy
                </Link>{' '}
                for full details on how we handle phone numbers and SMS data.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-3xl rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-blue-500/10 p-10 text-center">
          <h2 className="text-2xl font-bold tracking-tight">
            Ready to start receiving funding alerts?
          </h2>
          <p className="mt-3 text-sm text-slate-400">
            Sign up for free, save your filters, and verify your phone in Settings.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)] transition-all hover:bg-emerald-500"
          >
            Create your free account
          </Link>
        </div>
      </section>

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
