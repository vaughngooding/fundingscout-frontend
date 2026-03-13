export function formatAmount(amount: number): string {
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

export function formatRelativeTime(dateString: string): string {
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

export function formatFundingType(type: string): string {
  return type
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

export function countryFlag(countryCode: string | null): string {
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

export function fundingTypeBadgeColor(type: string): string {
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

export function confidenceBadge(score: number): { label: string; color: string } {
  if (score >= 80) return { label: 'Verified', color: 'text-emerald-400' }
  if (score >= 60) return { label: 'Likely', color: 'text-yellow-400' }
  return { label: 'Unverified', color: 'text-slate-500' }
}
