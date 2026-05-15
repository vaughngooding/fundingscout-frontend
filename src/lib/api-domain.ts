/**
 * Domain + name normalization helpers used by the public API match engine.
 *
 * These have to match the normalization used by the press pipeline that
 * writes funding_rounds, otherwise customer accounts won't match real rounds.
 * Keep these functions PURE and deterministic — they're called on every row
 * upsert as well as every match query.
 */

const COMPANY_SUFFIX_RE =
  /[,\.]?\s*(Inc|LLC|L\.L\.C\.|Corp|Corporation|Ltd|Limited|Co|Company|Holdings|Group|LP|L\.P\.|PLC|SA|GmbH|AG|NV|BV)\.?\s*$/gi

/**
 * Normalize a domain string. Strips protocol, www., trailing slash, paths.
 * Lowercase. Returns null if not a usable domain.
 *
 * Examples:
 *   "https://www.Vellum.AI/about"  → "vellum.ai"
 *   "vellum.ai"                    → "vellum.ai"
 *   "https://vellum.ai?utm=foo"    → "vellum.ai"
 *   "not a url"                    → null (no dot in host)
 */
export function normalizeDomain(input: string | null | undefined): string | null {
  if (!input) return null
  let s = String(input).trim().toLowerCase()
  if (!s) return null
  // Strip protocol
  s = s.replace(/^https?:\/\//, '')
  // Strip path / query / fragment
  s = s.split('/')[0].split('?')[0].split('#')[0]
  // Strip leading www.
  s = s.replace(/^www\./, '')
  // Strip trailing dots
  s = s.replace(/\.+$/, '')
  if (!s.includes('.')) return null
  // Sanity: no spaces, no @
  if (/\s/.test(s) || s.includes('@')) return null
  return s
}

/**
 * Extract the domain from an email address and normalize it.
 *
 * Examples:
 *   "Sarah@Vellum.AI"        → "vellum.ai"
 *   "sarah@gmail.com"        → "gmail.com"
 *   "not-an-email"           → null
 */
export function extractEmailDomain(input: string | null | undefined): string | null {
  if (!input) return null
  const s = String(input).trim().toLowerCase()
  const at = s.lastIndexOf('@')
  if (at <= 0 || at === s.length - 1) return null
  return normalizeDomain(s.slice(at + 1))
}

/**
 * Normalize a company name for fuzzy matching. Strips common legal suffixes
 * (Inc, LLC, Corp, etc.), lowercases, removes non-alphanumerics, collapses
 * whitespace. The result is what we INDEX on for the third match path —
 * `client_accounts.normalized_name == funding_rounds.normalized(company_name)`.
 *
 * Mirrors the normalize() function in pressure_test_sketch.py and
 * build_early_alerts_dashboard.py to keep cross-stack matching consistent.
 *
 * Examples:
 *   "Vellum AI, Inc."   → "vellum ai"
 *   "Vellum AI"         → "vellum ai"
 *   "Vellum, LLC."      → "vellum"
 *   ""                  → ""
 */
export function normalizeName(input: string | null | undefined): string {
  if (!input) return ''
  let n = String(input).trim().toLowerCase()
  // Strip suffixes repeatedly until stable (handles "Foo Inc, LLC")
  for (let i = 0; i < 5; i++) {
    const next = n.replace(COMPANY_SUFFIX_RE, '').trim().replace(/[,.\s]+$/, '')
    if (next === n) break
    n = next
  }
  // Strip non-alphanumeric (except spaces), collapse whitespace
  n = n.replace(/[^a-z0-9 ]+/g, ' ')
  n = n.replace(/\s+/g, ' ').trim()
  return n
}

/**
 * Common "free email" providers we DON'T match contact emails against the
 * funding_rounds.website domain because the result would be useless (every
 * funding round at gmail.com would notify every gmail user in every CRM).
 * Used by the email_domain match path in the send-webhooks function.
 */
export const FREE_EMAIL_DOMAINS = new Set<string>([
  'gmail.com',
  'googlemail.com',
  'yahoo.com',
  'yahoo.co.uk',
  'yahoo.co.in',
  'hotmail.com',
  'outlook.com',
  'live.com',
  'aol.com',
  'icloud.com',
  'me.com',
  'mac.com',
  'protonmail.com',
  'proton.me',
  'pm.me',
  'mail.com',
  'gmx.com',
  'gmx.us',
  'zoho.com',
  'fastmail.com',
])

export function isFreeEmailDomain(domain: string | null | undefined): boolean {
  if (!domain) return false
  return FREE_EMAIL_DOMAINS.has(domain.toLowerCase())
}
