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
}
