'use client'

import type { FundingRound } from '@/lib/types'
import { exportToCSV } from '@/lib/csv-export'

interface ExportButtonProps {
  rounds: FundingRound[]
}

export default function ExportButton({ rounds }: ExportButtonProps) {
  if (rounds.length === 0) return null

  return (
    <button
      onClick={() => exportToCSV(rounds, `fundingscout-bookmarks-${new Date().toISOString().slice(0, 10)}.csv`)}
      className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm text-slate-300 hover:text-white hover:border-slate-600 transition-colors"
      title="Export bookmarks to CSV"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export CSV
    </button>
  )
}
