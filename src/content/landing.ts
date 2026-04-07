/**
 * Landing page copy — single source of truth for all marketing content.
 *
 * Edit this file to change ANY text on the home page (https://fundingscout.io).
 * After editing: commit + push to git, Vercel auto-deploys in ~1 min.
 *
 * In v1.1 we'll wire this up to a Notion-backed CMS so non-technical edits
 * don't require a git commit. The shape of this object is stable so the
 * migration is just changing the data source.
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
    primaryCta: 'Start free',
    primaryCtaHref: '/signup',
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
    ctaHref: '/signup',
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
          { label: '$89', tone: 'price-highlight' as const },
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
  pricing: {
    eyebrow: 'Pricing',
    headline: 'One deal pays for the year.',
    subheadline: 'Start free. Upgrade when you need real-time alerts.',
    plans: [
      {
        name: 'Free',
        price: '$0',
        period: '/month',
        description: 'Perfect for evaluating funding signals without commitment.',
        cta: 'Start free',
        ctaHref: '/signup',
        ctaStyle: 'secondary' as const,
        recommended: false,
        features: [
          { text: 'Daily or weekly email digest', included: true },
          { text: 'Web dashboard access', included: true },
          { text: 'Custom filters', included: true },
          { text: 'Real-time alerts', included: false },
          { text: 'SMS / Slack / Telegram delivery', included: false },
          { text: 'Bookmarks & CSV export', included: false },
        ],
      },
      {
        name: 'Pro',
        // Two prices the toggle switches between. Annual is the default.
        priceMonthly: '$89',
        priceAnnual: '$49',
        period: '/month',
        annualBilledNote: 'Billed $588 once a year — save $480 vs monthly.',
        monthlyBilledNote: 'Billed monthly. Cancel anytime.',
        description: 'For founders, reps, and VCs who need to act on signals fast.',
        cta: 'Go Pro',
        ctaHrefMonthly: '/signup?plan=monthly',
        ctaHrefAnnual: '/signup?plan=annual',
        ctaStyle: 'primary' as const,
        recommended: true,
        features: [
          { text: 'Everything in Free', included: true },
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
          'Within 60 seconds of a matching round being published. We poll our sources every minute, our AI extracts the details, and we push to your phone immediately if it matches your filters.',
      },
      {
        question: 'Which sources do you monitor?',
        answer:
          'TechCrunch Startups, Crunchbase News, FinSMEs, EU-Startups, Pulse2 VC, Axios, and 8+ Google Alert feeds covering stealth, seed, Series A, and beyond. We add new sources regularly.',
      },
      {
        question: 'Can I cancel anytime?',
        answer:
          'Yes. Pro is month-to-month, no contracts. Cancel from your Settings page in one click and you keep access until the end of your billing period.',
      },
      {
        question: 'What if I want to stay on the Free plan forever?',
        answer:
          'You can. Free includes the daily digest, web dashboard, and custom filters. You only need Pro if you want real-time delivery to your phone or other channels.',
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
    subheadline: 'Set up takes 2 minutes. No credit card required for the free plan.',
    primaryCta: 'Start free',
    primaryCtaHref: '/signup',
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
    ],
    copyright: 'FundingScout. All rights reserved.',
  },
} as const

export type LandingContent = typeof landingContent
