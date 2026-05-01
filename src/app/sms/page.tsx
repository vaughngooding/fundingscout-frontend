import Image from 'next/image'
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

      {/* ===== FOR SMS VERIFICATION REVIEWERS ===== */}
      {/* This block exists so a Twilio (or other carrier) verification reviewer can
          confirm the entire opt-in flow without creating a FundingScout account.
          Everything required for verification — brand, use case, exact consent
          language, screenshots of the live form, sample messages, opt-out — is
          contained on this single page.
      */}
      <section id="reviewer-summary" className="px-6 pt-12 pb-4">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-400">
              For SMS verification reviewers
            </p>
            <h2 className="mt-2 text-xl font-bold text-white">
              Brand, use case, opt-in proof — single page
            </h2>
            <dl className="mt-5 space-y-3 text-sm">
              <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold text-slate-400">Brand</dt>
                <dd className="text-white">FundingScout (fundingscout.io)</dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold text-slate-400">Use case</dt>
                <dd className="text-white">
                  Account Notifications — transactional, real-time SMS funding alerts
                  matching the user&apos;s saved filters in their FundingScout account.
                </dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold text-slate-400">Opt-in type</dt>
                <dd className="text-white">
                  Web form, double opt-in — checkbox consent + SMS-delivered one-time
                  verification code. The flow lives in the user&apos;s authenticated
                  Settings page; the exact UI and consent language are reproduced
                  verbatim below as live screenshots.
                </dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold text-slate-400">Exact consent text</dt>
                <dd className="text-white">
                  See the verbatim consent paragraph in the &quot;Live opt-in form&quot;
                  section below. The checkbox label reads{' '}
                  <em className="text-emerald-300">
                    &quot;I agree to receive SMS text messages from FundingScout.&quot;
                  </em>{' '}
                  The &quot;Send Code&quot; button is disabled until the checkbox is checked.
                </dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold text-slate-400">Frequency</dt>
                <dd className="text-white">Up to 10 messages per day.</dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold text-slate-400">Opt-out</dt>
                <dd className="text-white">
                  Reply <span className="font-mono text-slate-300">STOP</span> to any
                  message. Help: reply{' '}
                  <span className="font-mono text-slate-300">HELP</span>.
                </dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold text-slate-400">Sample messages</dt>
                <dd className="text-white">
                  See the &quot;Sample messages&quot; section below — both the welcome
                  confirmation message (sent immediately after verification) and the
                  recurring alert message format.
                </dd>
              </div>
              <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
                <dt className="font-semibold text-slate-400">Privacy &amp; terms</dt>
                <dd className="text-white">
                  <Link href="/privacy" className="text-emerald-400 hover:underline">
                    Privacy Policy
                  </Link>{' '}
                  and the SMS Program Terms (anchored on this page) are linked from the
                  live opt-in form.
                </dd>
              </div>
            </dl>
            <p className="mt-5 text-xs leading-relaxed text-slate-400">
              All proof of consent is on this single page. No login is required to
              verify the opt-in workflow.
            </p>
          </div>
        </div>
      </section>

      {/* Hero */}
      <section className="px-6 pt-8 pb-8">
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

      {/* ===== Live opt-in form (screenshots of the actual /settings UI) ===== */}
      <section id="live-form" className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Live opt-in form</h2>
          <p className="mt-3 text-sm text-slate-400">
            Below are unedited screenshots of the actual opt-in form users see when they
            visit{' '}
            <span className="font-mono text-slate-300">fundingscout.io/settings</span>{' '}
            after creating an account. The consent paragraph, checkbox label, and
            disabled-button behavior visible in these screenshots are exactly what every
            user sees and interacts with — no marketing replicas, no rephrasing.
          </p>

          {/* Screenshot 1 — empty form state */}
          <figure className="mt-8">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
              <Image
                src="/screenshots/sms-optin-empty.png"
                alt="Live FundingScout SMS opt-in form on the Settings page, empty state — phone number field blank, consent checkbox unchecked, Send Code button disabled."
                width={1216}
                height={1216}
                className="rounded-md"
                priority
              />
            </div>
            <figcaption className="mt-3 text-xs text-slate-500">
              Step A — Empty state. The user has navigated to Settings → Phone
              Notifications. The &quot;Send Code&quot; button is disabled until both a phone
              number is entered AND the SMS consent checkbox is checked.
            </figcaption>
          </figure>

          {/* Screenshot 2 — filled form state */}
          <figure className="mt-8">
            <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
              <Image
                src="/screenshots/sms-optin-active.png"
                alt="Live FundingScout SMS opt-in form on the Settings page, filled state — phone number entered, consent checkbox checked, Send Code button enabled."
                width={1216}
                height={1216}
                className="rounded-md"
              />
            </div>
            <figcaption className="mt-3 text-xs text-slate-500">
              Step B — Filled state. Phone number entered, consent checkbox checked. The
              &quot;Send Code&quot; button becomes active. Clicking it triggers Twilio Verify to
              send a one-time code via SMS to the entered number; the user must enter
              that code to complete double opt-in.
            </figcaption>
          </figure>

          {/* Verbatim consent text block — accessibility + reviewer convenience */}
          <div className="mt-10 rounded-2xl border border-slate-600 bg-slate-800/60 p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Verbatim consent paragraph shown above the checkbox
            </p>
            <blockquote className="mt-4 border-l-2 border-emerald-500/60 pl-4 text-sm leading-relaxed text-slate-200">
              By checking the box below and clicking &quot;Send Code,&quot; I agree to receive
              recurring automated SMS text messages from FundingScout containing
              real-time funding alerts matching my saved filters. Up to 10 messages per
              day. Message and data rates may apply. Consent is not a condition of any
              purchase. Reply STOP at any time to unsubscribe, or HELP for help.
            </blockquote>
            <p className="mt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              Verbatim checkbox label
            </p>
            <blockquote className="mt-2 border-l-2 border-emerald-500/60 pl-4 text-sm leading-relaxed text-slate-200">
              I agree to receive SMS text messages from FundingScout
            </blockquote>
          </div>
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
                  Start your 7-day trial for $2.99 at{' '}
                  <Link
                    href="/signup?plan=trial"
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

      {/* Sample messages — welcome confirmation + recurring alert */}
      <section id="sample-messages" className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">Sample messages</h2>
          <p className="mt-3 text-sm text-slate-400">
            Two message types are sent to subscribers. The first is the welcome
            confirmation immediately after a user completes double opt-in; the second
            is the recurring transactional alert that fires when a funding event
            matches the user&apos;s saved filters.
          </p>

          {/* Welcome / confirmation SMS */}
          <div className="mt-6">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              1. Welcome confirmation (sent immediately after verification)
            </p>
            <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <p className="font-mono text-sm text-slate-200">
                FundingScout: You&apos;re subscribed to SMS funding alerts. Up to 10
                msgs/day. Msg &amp; data rates may apply. Reply STOP to cancel, HELP for
                help.
              </p>
            </div>
          </div>

          {/* Recurring alert SMS */}
          <div className="mt-8">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              2. Recurring funding alert (sent when a saved filter matches)
            </p>
            <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-800 p-6">
              <p className="font-mono text-sm text-slate-200">
                FundingScout: HexemBio raised $10.4M (seed).
                https://www.finsmes.com/2026/04/hexembio-raises-10-4m-in-seed-funding/
              </p>
            </div>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Sent from FundingScout&apos;s verified toll-free number — sender ID may vary
            by carrier.
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
                  href="mailto:info@fundingscout.io"
                  className="text-emerald-400 underline-offset-2 hover:underline"
                >
                  info@fundingscout.io
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

      {/* SMS Program Terms and Conditions */}
      <section id="terms" className="px-6 py-12">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-2xl font-bold tracking-tight">
            SMS Program Terms and Conditions
          </h2>
          <p className="mt-3 text-sm text-slate-500">
            Last updated: April 2026
          </p>

          <div className="mt-6 space-y-5 rounded-2xl border border-slate-700 bg-slate-800/60 p-6 text-sm leading-relaxed text-slate-400">
            <p>
              <span className="font-semibold text-slate-200">1. Program description.</span>{' '}
              The FundingScout SMS alert program (&ldquo;Program&rdquo;) delivers automated text
              message notifications about startup funding rounds that match the alert
              filters you save in your FundingScout account. The Program is operated by
              FundingScout (&ldquo;we,&rdquo; &ldquo;us,&rdquo; &ldquo;our&rdquo;).
            </p>
            <p>
              <span className="font-semibold text-slate-200">2. Eligibility.</span>{' '}
              You must be at least 18 years old and the account holder or authorized
              user of the mobile phone number you enroll. You must have a valid
              FundingScout account and have completed the double opt-in verification
              described above.
            </p>
            <p>
              <span className="font-semibold text-slate-200">3. Consent.</span>{' '}
              By checking the consent box on your Settings page and completing SMS
              verification, you expressly consent to receive recurring automated text
              messages from FundingScout at the mobile number you provided. Consent is
              not a condition of purchase of any FundingScout product or service.
            </p>
            <p>
              <span className="font-semibold text-slate-200">4. Message frequency.</span>{' '}
              You will receive up to 10 messages per day. Actual frequency depends on
              the breadth of your saved filters and how many funding rounds match on a
              given day. Most users receive fewer than 5 messages per day.
            </p>
            <p>
              <span className="font-semibold text-slate-200">5. Costs.</span>{' '}
              FundingScout does not charge a per-message fee for SMS alerts. Message
              and data rates from your mobile carrier may apply. Contact your carrier
              for pricing on SMS and data services.
            </p>
            <p>
              <span className="font-semibold text-slate-200">6. Supported carriers.</span>{' '}
              The Program is available on all major U.S. wireless carriers, including
              AT&amp;T, T-Mobile, Verizon Wireless, and their MVNOs. Carriers are not
              liable for delayed or undelivered messages.
            </p>
            <p>
              <span className="font-semibold text-slate-200">7. How to opt out.</span>{' '}
              You may cancel the Program at any time by replying{' '}
              <span className="font-mono text-slate-200">STOP</span> to any FundingScout
              message. You will receive a single confirmation message and will not
              receive any further SMS notifications. You may also remove your phone
              number from Settings → Phone Notifications.
            </p>
            <p>
              <span className="font-semibold text-slate-200">8. How to get help.</span>{' '}
              Reply <span className="font-mono text-slate-200">HELP</span> to any
              FundingScout message, or email{' '}
              <a
                href="mailto:info@fundingscout.io"
                className="text-emerald-400 underline-offset-2 hover:underline"
              >
                info@fundingscout.io
              </a>
              .
            </p>
            <p>
              <span className="font-semibold text-slate-200">9. No warranty.</span>{' '}
              FundingScout alerts are provided on an &ldquo;as-is&rdquo; basis for informational
              purposes only. We do not guarantee the accuracy, timeliness, or delivery
              of any message, and we are not responsible for investment, business, or
              other decisions made based on the content of any alert. Nothing in an
              SMS alert constitutes investment advice or a recommendation to buy or
              sell any security.
            </p>
            <p>
              <span className="font-semibold text-slate-200">10. Changes.</span>{' '}
              We may modify or terminate the Program at any time, with or without
              notice. Continued use of the Program after changes constitutes
              acceptance of the updated terms.
            </p>
            <p>
              <span className="font-semibold text-slate-200">11. Privacy.</span>{' '}
              Information collected in connection with the Program is handled
              according to our{' '}
              <Link
                href="/privacy"
                className="text-emerald-400 underline-offset-2 hover:underline"
              >
                Privacy Policy
              </Link>
              .
            </p>
            <p>
              <span className="font-semibold text-slate-200">12. Contact.</span>{' '}
              Questions about these Terms? Email{' '}
              <a
                href="mailto:info@fundingscout.io"
                className="text-emerald-400 underline-offset-2 hover:underline"
              >
                info@fundingscout.io
              </a>
              .
            </p>
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
            Start your 7-day trial for $2.99, save your filters, and verify your phone in Settings.
          </p>
          <Link
            href="/signup?plan=trial"
            className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-7 py-3.5 text-base font-semibold text-white shadow-[0_8px_24px_-8px_rgba(16,185,129,0.5)] transition-all hover:bg-emerald-500"
          >
            Try 7 days for $2.99
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
