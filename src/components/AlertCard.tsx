'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserAlert } from '@/lib/types'

function formatAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')}B`
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(0)}K`
  }
  return `$${amount}`
}

function formatRelativeTime(dateString: string): string {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60_000)
  const diffHours = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  if (diffMinutes < 1) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatFundingType(type: string): string {
  return type
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function countryFlag(countryCode: string | null): string {
  if (!countryCode) return ''
  const code = countryCode.toUpperCase()
  const flags: Record<string, string> = {
    US: '\u{1F1FA}\u{1F1F8}',
    CA: '\u{1F1E8}\u{1F1E6}',
    GB: '\u{1F1EC}\u{1F1E7}',
    UK: '\u{1F1EC}\u{1F1E7}',
    DE: '\u{1F1E9}\u{1F1EA}',
    FR: '\u{1F1EB}\u{1F1F7}',
    IL: '\u{1F1EE}\u{1F1F1}',
    IN: '\u{1F1EE}\u{1F1F3}',
    AU: '\u{1F1E6}\u{1F1FA}',
    SG: '\u{1F1F8}\u{1F1EC}',
    JP: '\u{1F1EF}\u{1F1F5}',
    KR: '\u{1F1F0}\u{1F1F7}',
    BR: '\u{1F1E7}\u{1F1F7}',
  }
  return flags[code] || '\u{1F30D}'
}

function fundingTypeBadgeColor(type: string): string {
  const colors: Record<string, string> = {
    'pre-seed': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    seed: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'series-a': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'series-b': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'series-c': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'series-d': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'series-e': 'bg-red-500/20 text-red-300 border-red-500/30',
  }
  return colors[type.toLowerCase()] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
}

interface AlertCardProps {
  alert: UserAlert
}

export default function AlertCard({ alert }: AlertCardProps) {
  const [bookmarked, setBookmarked] = useState(alert.is_bookmarked)
  const [toggling, setToggling] = useState(false)
  const round = alert.funding_round

  if (!round) return null

  async function toggleBookmark() {
    setToggling(true)
    const supabase = createClient()
    const newValue = !bookmarked
    setBookmarked(newValue)

    const { error } = await supabase
      .from('user_alerts')
      .update({ is_bookmarked: newValue })
      .eq('id', alert.id)

    if (error) {
      setBookmarked(!newValue)
    }
    setToggling(false)
  }

  const isUnread = alert.status === 'pending' || alert.status === 'sent'

  return (
    <div className="group relative bg-slate-900 border border-slate-700/50 rounded-xl p-5 hover:border-slate-600 hover:bg-slate-800/80 transition-all duration-200">
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute top-4 right-4 w-2.5 h-2.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50" />
      )}

      {/* Header row: company + amount */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-lg font-bold text-white truncate">
            {round.company_name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {round.location && (
              <span className="text-sm text-slate-400">
                {countryFlag(round.location_country)} {round.location}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-2xl font-bold text-emerald-400">
            {formatAmount(round.amount_usd)}
          </span>
        </div>
      </div>

      {/* Funding type badge + time */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span
          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${fundingTypeBadgeColor(round.funding_type)}`}
        >
          {formatFundingType(round.funding_type)}
        </span>
        <span className="text-xs text-slate-500">
          {formatRelativeTime(alert.created_at)}
        </span>
      </div>

      {/* Industry tags */}
      {round.industry_tags && round.industry_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {round.industry_tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Lead investor */}
      {round.lead_investor && (
        <p className="text-sm text-slate-400 mb-3">
          <span className="text-slate-500">Lead:</span>{' '}
          <span className="text-slate-300 font-medium">{round.lead_investor}</span>
        </p>
      )}

      {/* Bottom row: actions */}
      <div className="flex items-center justify-between pt-3 border-t border-slate-700/50">
        <a
          href={round.article_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 font-medium transition-colors"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          Read Article
        </a>

        <button
          onClick={toggleBookmark}
          disabled={toggling}
          className={`p-1.5 rounded-lg transition-colors ${
            bookmarked
              ? 'text-amber-400 hover:text-amber-300'
              : 'text-slate-500 hover:text-slate-300'
          } disabled:opacity-50`}
          title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
        >
          <svg
            className="w-5 h-5"
            fill={bookmarked ? 'currentColor' : 'none'}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
