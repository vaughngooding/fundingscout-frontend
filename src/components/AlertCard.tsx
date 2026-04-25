'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { trackOutboundClick } from '@/components/PageTracker'
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
  const [flagged, setFlagged] = useState(alert.user_flag)
  const [showFlagMenu, setShowFlagMenu] = useState(false)
  const flagMenuRef = useRef<HTMLDivElement>(null)
  const round = alert.funding_round

  // Close flag menu on outside click
  useEffect(() => {
    if (!showFlagMenu) return
    function handleClick(e: MouseEvent) {
      if (flagMenuRef.current && !flagMenuRef.current.contains(e.target as Node)) {
        setShowFlagMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showFlagMenu])

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

  async function flagAlert(reason: 'not_funding' | 'duplicate' | 'incorrect_details') {
    const supabase = createClient()
    // Toggle off if already flagged with the same reason
    const newFlag = flagged === reason ? null : reason
    const { error } = await supabase
      .from('user_alerts')
      .update({
        user_flag: newFlag,
        user_flag_at: newFlag ? new Date().toISOString() : null,
      })
      .eq('id', alert.id)

    if (!error) {
      setFlagged(newFlag)
    }
    setShowFlagMenu(false)
  }

  const isUnread = alert.status === 'pending' || alert.status === 'sent'
  const companyHref = `/company/${encodeURIComponent(round.company_name)}`

  return (
    <div className="group relative bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 hover:border-slate-600 hover:bg-slate-800/80 transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        {/* Left: company + meta */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Link
              href={companyHref}
              className="text-base font-bold text-white truncate hover:text-blue-300 transition-colors"
            >
              {round.company_name}
            </Link>
            {isUnread && (
              <span className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 flex-shrink-0" />
            )}
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400 min-w-0">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border flex-shrink-0 ${fundingTypeBadgeColor(round.funding_type)}`}
            >
              {formatFundingType(round.funding_type)}
            </span>
            {round.location && (
              <span className="truncate flex-shrink min-w-0">
                {countryFlag(round.location_country)} {round.location}
              </span>
            )}
            {round.lead_investor && (
              <>
                <span className="text-slate-600 flex-shrink-0">•</span>
                <span className="truncate flex-shrink min-w-0">
                  Led by <span className="text-slate-300">{round.lead_investor}</span>
                </span>
              </>
            )}
            <span className="text-slate-600 flex-shrink-0">•</span>
            <span className="flex-shrink-0">{formatRelativeTime(alert.created_at)}</span>
          </div>

          {/* Second meta line: CEO + website (only shown for enriched rounds) */}
          {round.enrichment_attempted_at && (
            <div className="flex items-center gap-3 mt-1 text-xs text-slate-400 min-w-0">
              <span className="flex items-center gap-1 truncate flex-shrink min-w-0">
                <span className="text-slate-500">👤</span>
                <span className={round.ceo_name ? 'text-slate-300' : 'text-slate-500 italic'}>
                  {round.ceo_name || 'Unknown'}
                </span>
              </span>
              <span className="text-slate-600 flex-shrink-0">•</span>
              <span className="flex items-center gap-1 truncate flex-shrink min-w-0">
                <span className="text-slate-500">🌐</span>
                {round.website ? (
                  <a
                    href={round.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition-colors truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {round.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                ) : (
                  <span className="text-slate-500 italic">Unknown</span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Right: amount + actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-xl font-bold text-emerald-400 whitespace-nowrap mr-1">
            {formatAmount(round.amount_usd)}
          </span>
          <a
            href={round.article_url}
            target="_blank"
            rel="noopener noreferrer"
            onMouseDown={() => trackOutboundClick(round.article_url)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-300 transition-colors"
            title="Read article"
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
              className="w-4 h-4"
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
          {/* Flag button */}
          <div className="relative" ref={flagMenuRef}>
            <button
              onClick={() => setShowFlagMenu(!showFlagMenu)}
              className={`p-1.5 rounded-lg transition-colors ${
                flagged
                  ? 'text-red-400 hover:text-red-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title={flagged ? `Flagged: ${flagged.replace('_', ' ')}` : 'Flag this alert'}
            >
              <svg className="w-4 h-4" fill={flagged ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" />
              </svg>
            </button>
            {showFlagMenu && (
              <div className="absolute right-0 top-full mt-1 z-10 w-48 rounded-lg border border-slate-700 bg-slate-800 shadow-lg py-1">
                <button
                  onClick={() => flagAlert('not_funding')}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 ${
                    flagged === 'not_funding' ? 'text-red-400' : 'text-slate-300'
                  }`}
                >
                  Not a funding round
                </button>
                <button
                  onClick={() => flagAlert('duplicate')}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 ${
                    flagged === 'duplicate' ? 'text-red-400' : 'text-slate-300'
                  }`}
                >
                  Duplicate
                </button>
                <button
                  onClick={() => flagAlert('incorrect_details')}
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-slate-700 ${
                    flagged === 'incorrect_details' ? 'text-red-400' : 'text-slate-300'
                  }`}
                >
                  Incorrect details
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
