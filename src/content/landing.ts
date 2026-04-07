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
    eyebrow: 'AI-powered funding intelligence',
    headline: 'Real-time funding alerts',
    subheadline:
      'FundingScout monitors every funding announcement across the web 24/7 and pushes the rounds that match your filters straight to your phone. Real-time. Filtered. Actionable.',
    primaryCta: 'Start free',
    primaryCtaHref: '/signup',
    secondaryCta: 'See pricing',
    secondaryCtaHref: '#pricing',
    socialProof: 'Trusted by founders, VCs, and B2B sales teams',
  },

  // ─── Logo bar (placeholder — swap in real customer logos when you have them) ───
  logos: {
    label: 'Trusted by teams at',
    items: ['SDR Reps', 'Series A Founders', 'B2B Sales Leaders', 'VC Associates', 'Growth Marketers'],
  },

  // ─── How it works ───
  howItWorks: {
    eyebrow: 'How it works',
    headline: 'From signal to outreach in 3 steps',
    steps: [
      {
        number: '01',
        title: 'We monitor every funding announcement',
        description:
          'Our AI watches TechCrunch, Crunchbase, FinSMEs, EU-Startups, Pulse2 VC, and 8+ other sources every minute. No round slips through.',
      },
      {
        number: '02',
        title: 'AI extracts the details that matter',
        description:
          'Company name, amount raised, round stage, lead investors, location, and industry — pulled cleanly from every article. Zero manual work.',
      },
      {
        number: '03',
        title: 'You get only the alerts you care about',
        description:
          'Set your filters once (geography, round size, stage). Get a text the moment a matching round breaks — or a clean daily digest in your inbox.',
      },
    ],
  },

  // ─── Feature grid ───
  features: {
    eyebrow: 'Features',
    headline: 'Everything you need to act on funding signals',
    items: [
      {
        title: 'Real-time SMS alerts',
        description: 'A text on your phone within 60 seconds of a matching round breaking. No app to install.',
        icon: 'phone',
      },
      {
        title: 'Slack, Teams, Telegram',
        description: 'Pipe alerts into your team channel. Multiple integrations supported, one-click setup.',
        icon: 'chat',
      },
      {
        title: 'Custom filters',
        description: 'Filter by geography, funding stage, raise amount, industry. See only what matters to you.',
        icon: 'filter',
      },
      {
        title: 'Daily email digest',
        description: 'A clean curated summary delivered to your inbox every morning at your local 9am.',
        icon: 'email',
      },
      {
        title: 'Web dashboard',
        description: 'Browse, search, bookmark, and export every funding round in a fast prospecting dashboard.',
        icon: 'dashboard',
      },
      {
        title: 'CSV export',
        description: 'Pull filtered lists straight into your CRM. Built for outreach workflows.',
        icon: 'download',
      },
    ],
  },

  // ─── Dashboard preview ───
  dashboardPreview: {
    eyebrow: 'The dashboard',
    headline: 'Built for prospecting, not browsing',
    description:
      'Every funding round in one place. Filter by anything. Bookmark the ones that matter. Export to CSV. Built for sales teams that need to move fast.',
    cta: 'Try the dashboard',
    ctaHref: '/signup',
  },

  // ─── Pricing ───
  pricing: {
    eyebrow: 'Pricing',
    headline: 'Simple, transparent pricing',
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
        price: '$49',
        period: '/month',
        description: 'For founders, reps, and VCs who need to act on signals fast.',
        cta: 'Go Pro',
        ctaHref: '/signup?plan=pro',
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
