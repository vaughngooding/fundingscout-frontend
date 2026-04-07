export interface FundingRound {
  id: string
  company_name: string
  website: string | null
  location: string | null
  location_country: string | null
  amount_usd: number
  funding_type: string
  investors: string[]
  lead_investor: string | null
  industry: string | null
  industry_tags: string[]
  confidence_score: number
  article_url: string
  article_title: string | null
  source_feed: string | null
  published_date: string | null
  created_at: string
}

export interface UserAlert {
  id: string
  user_id: string
  funding_round_id: string
  status: 'pending' | 'sent' | 'read' | 'archived'
  is_bookmarked: boolean
  notes: string | null
  email_sent_at: string | null
  read_at: string | null
  created_at: string
  funding_round?: FundingRound
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  company: string | null
  role: string | null
  plan: 'free' | 'pro'
  timezone: string
  stripe_customer_id: string | null
}

export interface UserPreferences {
  id: string
  user_id: string
  min_amount: number
  max_amount: number
  funding_types: string[]
  countries: string[]
  industries: string[]
  digest_frequency: 'daily' | 'weekly'
  digest_hour: number
  slack_webhook_url: string | null
  teams_webhook_url: string | null
  // Phase 1: Telegram
  telegram_chat_id: number | null
  telegram_link_token: string | null
  // Phase 2: Web Push
  push_subscription: PushSubscriptionJSON | null
  // Phase 3: SMS / iMessage (phone is shared between channels)
  phone_number: string | null
  phone_verified: boolean
  imessage_enabled: boolean
  // Phase 4: Slack App
  slack_team_id: string | null
  slack_channel_id: string | null
  slack_bot_token: string | null
  slack_app_installed: boolean
}

export interface PushSubscriptionJSON {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

export interface CompanySummary {
  slug: string
  display_name: string
  round_count: number
  total_raised: number
  largest_round: number
  first_seen: string
  last_seen: string
  best_confidence: number
  location: string | null
  location_country: string | null
  website: string | null
  all_investors: string[] | null
  all_industry_tags: string[] | null
}

export interface ExploreStats {
  total_rounds: number
  total_capital: number
  avg_round_size: number
  unique_companies: number
  top_industries: { tag: string; cnt: number }[]
}
