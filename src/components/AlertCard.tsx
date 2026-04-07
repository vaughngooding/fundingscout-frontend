'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserAlert } from '@/lib/types'
import {
  formatAmount,
  formatRelativeTime,
  formatFundingType,
  countryFlag,
  fundingTypeBadgeColor,
} from '@/lib/utils'

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
    <div className="group relative rounded-2xl bg-white p-6 ring-1 ring-neutral-100 transition-all duration-200 hover:ring-neutral-200 hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.08)]">
      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute top-5 right-5 h-2.5 w-2.5 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/40" />
      )}

      {/* Header row: company + amount */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-4">
          <h3 className="text-lg font-bold tracking-tight text-neutral-950 truncate">
            {round.company_name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            {round.location && (
              <span className="text-sm text-neutral-500">
                {countryFlag(round.location_country)} {round.location}
              </span>
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <span className="text-2xl font-extrabold text-neutral-950">
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
        <span className="text-xs text-neutral-400">
          {formatRelativeTime(alert.created_at)}
        </span>
      </div>

      {/* Industry tags */}
      {round.industry_tags && round.industry_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {round.industry_tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-700"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Lead investor */}
      {round.lead_investor && (
        <p className="text-sm text-neutral-600 mb-3">
          <span className="text-neutral-400">Lead:</span>{' '}
          <span className="font-semibold text-neutral-800">{round.lead_investor}</span>
        </p>
      )}

      {/* Bottom row: actions */}
      <div className="flex items-center justify-between pt-3 border-t border-neutral-100">
        <a
          href={round.article_url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
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
          className={`rounded-lg p-1.5 transition-colors ${
            bookmarked
              ? 'text-amber-500 hover:text-amber-600'
              : 'text-neutral-400 hover:text-neutral-600'
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
