import type { FundingRound } from './types'

/**
 * Generate a CSV string from an array of FundingRound objects and trigger
 * a browser download. Arrays (investors, industry_tags) are joined with
 * semicolons so they stay in one cell.
 */
export function exportToCSV(rounds: FundingRound[], filename: string = 'fundingscout-export.csv') {
  if (rounds.length === 0) return

  const headers = [
    'Company',
    'Amount (USD)',
    'Funding Type',
    'Lead Investor',
    'Investors',
    'Location',
    'Country',
    'Industry',
    'Industry Tags',
    'CEO',
    'Website',
    'Description',
    'Founded Year',
    'Employees',
    'Confidence',
    'Article URL',
    'Published Date',
    'Created At',
  ]

  const rows = rounds.map((r) => [
    r.company_name,
    r.amount_usd,
    r.funding_type,
    r.lead_investor || '',
    (r.investors || []).join('; '),
    r.location || '',
    r.location_country || '',
    r.industry || '',
    (r.industry_tags || []).join('; '),
    r.ceo_name || '',
    r.website || '',
    r.company_description || '',
    r.founded_year || '',
    r.employee_range || '',
    r.confidence_score,
    r.article_url,
    r.published_date || '',
    r.created_at,
  ])

  const csvContent = [
    headers.map(escapeCSV).join(','),
    ...rows.map((row) => row.map(escapeCSV).join(',')),
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function escapeCSV(value: unknown): string {
  const str = String(value ?? '')
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}
