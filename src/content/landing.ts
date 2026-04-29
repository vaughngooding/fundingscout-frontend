/**
 * Landing page copy — single source of truth for all marketing content.
 *
 * Edit this file to change ANY text on the home page (https://fundingscout.io).
 * After editing: commit + push to git, Vercel auto-deploys in ~1 min.
 *
 * Pricing model (effective 2026-04-29):
 *   - Trial:   $2.99 for 7 days, auto-converts to Basic Monthly
 *   - Basic:   $19.99/mo or $99/yr — digest + dashboard + filters
 *   - Pro:     $89/mo or $588/yr — everything (real-time, SMS, integrations)
 *
 * No free signup option exists for new users. Existing free users are
 * grandfathered indefinitely on `legacy_free=true`.
 */

export const landingContent = {
  // ─── Top nav ───
  nav: {
    brandFunding: 'Funding',
    brandScout: 'Scout',
    loginLabel: 'Sign in',
    signupLabel: 'Get started',
  },

  // ─── Hero section ───
  hero: {
    eyebrow: '',
    headline: 'Real-time funding alerts',
    subheadline:
      'Delivered instantly via SMS, Teams, Slack, Telegram, WhatsApp, or email.',
    primaryCta: 'Try 7 days for $2.99',
    primaryCtaHref: '/signup?plan=trial',
    secondaryCta: 'See pricing',
    secondaryCtaHref: '#pricing',
    socialProof: '',
  },

  // ─── Real product screenshots (no header text — just visuals) ───
  channels: {
    items: [
      {
        src: '/screenshots/sms-alerts.png',
        alt: 'FundingScout SMS alerts on iPhone showing multiple funding rounds',
        rotate: '-rotate-2',
      },
      {
        src: '/screenshots/teams-alerts.jpg',
        alt: 'FundingScout Microsoft Teams alerts showing funding rounds with company details',
        rotate: 'rotate-1',
      },
      {
        src: '/screenshots/slack-alerts.png',
        alt: 'FundingScout Slack app delivering structured funding alerts in a #funding-alerts channel',
        rotate: '-rotate-1',
      },
    ],
  },

  // ─── Logo bar (placeholder — swap in real customer logos when you have them) ───
  logos: {
    label: 'Trusted by teams at',
    items: ['SDR Reps', 'Series A Founders', 'B2B Sales Leaders', 'VC Associates', 'Growth Marketers'],
  },

  // ─── Dashboard preview ───
  dashboardPreview: {
    eyebrow: 'The dashboard',
    headline: 'Filter + browse funding events',
    description:
      'Every funding round in one place. Filter by anything. Bookmark the ones that matter. Export to CSV. Built for sales teams that need to move fast.',
    cta: 'Try the dashboard',
    ctaHref: '/signup?plan=trial',
  },

  // ─── Competitor comparison ───
  comparison: {
    eyebrow: 'How we compare',
    headline: 'FundingScout alternatives',
    columns: ['Tool', 'Real-time alerts', 'SMS / Slack delivery', 'Noise / false alerts', 'Filters', 'Price / mo'],
    rows: [
      {
        tool: 'FundingScout',
        highlight: true,
        cells: [
          { label: 'Yes', tone: 'good' as const },
          { label: 'Yes', tone: 'good' as const },
          { label: 'Low', tone: 'good' as const },
          { label: 'Yes', tone: 'good' as const },
          { label: 'From $19.99', tone: 'price-highlight' as const },
        ],
      },
      {
        tool: 'Google Alerts',
        highlight: false,
        cells: [
          { label: 'Delayed', tone: 'medium' as const },
          { label: 'No', tone: 'bad' as const },
          { label: 'Very high', tone: 'bad' as const },
          { label: 'No', tone: 'bad' as const },
          { label: 'Free', tone: 'price-free' as const },
        ],
      },
      {
        tool: 'Crunchbase Pro',
        highlight: false,
        cells: [
          { label: 'No', tone: 'bad' as const },
          { label: 'No', tone: 'bad' as const },
          { label: 'Low', tone: 'good' as const },
          { label: 'Yes', tone: 'good' as const },
          { label: '$99', tone: 'price' as const },
        ],
      },
      {
        tool: 'PitchBook',
        highlight: false,
        cells: [
          { label: 'No', tone: 'bad' as const },
          { label: 'No', tone: 'bad' as const },
          { label: 'Low', tone: 'good' as const },
          { label: 'Yes', tone: 'good' as const },
          { label: '$1,667+', tone: 'price' as const },
        ],
      },
      {
        tool: 'TechCrunch / PR Newswire',
        highlight: false,
        cells: [
          { label: 'Manual', tone: 'medium' as const },
          { label: 'No', tone: 'bad' as const },
          { label: 'Very high', tone: 'bad' as const },
          { label: 'No', tone: 'bad' as const },
          { label: 'Free', tone: 'price-free' as const },
        ],
      },
    ],
  },

  // ─── Pricing ───
  // Two paid tiers (Basic + Pro), each with monthly/annual toggle.
  // The Trial banner above the cards offers a low-friction $2.99 entry.
  pricing: {
    eyebrow: 'Pricing',
    headline: 'One deal pays for the year.',
    subheadline: 'Start with a 7-day trial for $2.99. Upgrade anytime.',

    // Trial CTA banner — shown above the two paid cards.
    trial: {
      eyebrow: 'Start small',
      headline: 'Try FundingScout for 7 days — $2.99',
      description:
        'Full Basic access for a week. Auto-converts to Basic Monthly ($19.99/mo) at day 8. Cancel anytime.',
      cta: 'Try 7 days for $2.99',
      ctaHref: '/signup?plan=trial',
    },

    plans: [
      {
        id: 'basic',
        name: 'Basic',
        // Two prices the toggle switches between. Annual saves you ~59%.
        priceMonthly: '$19.99',
        priceAnnual: '$8.25',
        period: '/month',
        annualBilledNote: 'Billed $99 once a year — save $140 vs monthly.',
        monthlyBilledNote: 'Billed monthly. Cancel anytime.',
        description: 'Daily intelligence delivered to your inbox.',
        cta: 'Get Basic',
        ctaHrefMonthly: '/signup?plan=basic',
        ctaHrefAnnual: '/signup?plan=basic-annual',
        ctaStyle: 'secondary' as const,
        recommended: false,
        features: [
          { text: 'Daily or weekly email digest', included: true },
          { text: 'Web dashboard access', included: true },
          { text: 'Custom filters (industry, stage, geography, deal size)', included: true },
          { text: 'Real-time alerts within 60 sec', included: false },
          { text: 'SMS / Slack / Teams / Telegram delivery', included: false },
          { text: 'Bookmarks, notes, CSV export', included: false },
        ],
      },
      {
        id: 'pro',
        name: 'Pro',
        priceMonthly: '$89',
        priceAnnual: '$49',
        period: '/month',
        annualBilledNote: 'Billed $588 once a year — save $480 vs monthly.',
        monthlyBilledNote: 'Billed monthly. Cancel anytime.',
        description: 'For founders, reps, and VCs who need to act on signals fast.',
        cta: 'Go Pro',
        ctaHrefMonthly: '/signup?plan=pro',
        ctaHrefAnnual: '/signup?plan=pro-annual',
        ctaStyle: 'primary' as const,
        recommended: true,
        features: [
          { text: 'Everything in Basic', included: true },
          { text: 'Real-time alerts (within 60 sec)', included: true },
          { text: 'SMS to your phone', included: true },
          { text: 'Slack, Teams, Telegram delivery', included: true },
          { text: 'WhatsApp delivery (coming soon)', included: true },
          { text: 'Bookmarks, notes, CSV export', included: true },
        ],
      },
    ],
  },

  // ─── FAQ ───
  faq: {
    eyebrow: 'FAQ',
    headline: 'Frequently asked questions',
    items: [
      {
        question: 'How fast are the real-time alerts?',
        answer:
          'Within 60 seconds of a matching round being published. We poll our sources every minute, our AI extracts the details, and we push to your phone immediately if it matches your filters. (Pro tier only — Basic gets the daily/weekly digest.)',
      },
      {
        question: "What's the difference between Basic and Pro?",
        answer:
          'Basic ($19.99/mo) gets you the daily or weekly email digest, the full web dashboard with filters, and bookmarking — perfect if you just want to stay informed. Pro ($89/mo) adds real-time alerts within 60 seconds, plus SMS, Slack, Teams, Telegram delivery, and CSV export — built for sales teams and investors who need to act before competitors do.',
      },
      {
        question: 'What happens after the 7-day trial?',
        answer:
          'On day 8 your card is charged $19.99 and you continue on the Basic plan month-to-month. You can cancel anytime from Settings before day 8 (no further charge) or after (keeps access until the end of the billing period). Want Pro instead of Basic at conversion? Upgrade in one click from your dashboard.',
      },
      {
        question: 'Which sources do you monitor?',
        answer:
          'TechCrunch Startups, Crunchbase News, FinSMEs, EU-Startups, Pulse2 VC, Axios, and 8+ Google Alert feeds covering stealth, seed, Series A, and beyond. We add new sources regularly.',
      },
      {
        question: 'Can I cancel anytime?',
        answer:
          'Yes. Both Basic and Pro are month-to-month, no contracts. Cancel from your Settings page in one click and you keep access until the end of your billing period.',
      },
      {
        question: 'Do you offer a team plan?',
        answer:
          'Not yet — we\'re focused on getting individual usage right first. Reach out if you need a team setup and we\'ll work something out.',
      },
    ],
  },

  // ─── Final CTA banner ───
  finalCta: {
    headline: 'Ready to find your next customer?',
    subheadline: 'Set up takes 2 minutes. 7-day trial for $2.99 — cancel anytime.',
    primaryCta: 'Try 7 days for $2.99',
    primaryCtaHref: '/signup?plan=trial',
  },

  // ─── Footer ───
  footer: {
    tagline: 'Real-time funding intelligence for founders, reps, and VCs.',
    columns: [
      {
        title: 'Product',
        links: [
          { label: 'Features', href: '#features' },
          { label: 'Pricing', href: '#pricing' },
          { label: 'Dashboard', href: '/dashboard' },
        ],
      },
      {
        title: 'Account',
        links: [
          { label: 'Sign in', href: '/login' },
          { label: 'Sign up', href: '/signup' },
          { label: 'Settings', href: '/settings' },
        ],
      },
      {
        title: 'Legal',
        links: [
          { label: 'SMS Alerts', href: '/sms' },
          { label: 'Privacy Policy', href: '/privacy' },
        ],
      },
    ],
    copyright: 'FundingScout. All rights reserved.',
  },
} as const

export type LandingContent = typeof landingContent
