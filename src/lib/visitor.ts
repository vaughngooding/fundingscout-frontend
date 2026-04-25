import { createHash } from 'node:crypto'

// Privacy-friendly anonymous visitor identification.
// Hashes (ip + user-agent + daily salt) — no cookies set, no PII stored.
// Same pattern as Plausible / Umami / Fathom. The daily salt rotation
// means the same person on different days gets different visitor_ids,
// which prevents cross-day re-identification but still lets us count
// distinct visitors within a day.
export function hashVisitor(ip: string, userAgent: string): string {
  const salt = process.env.TRACK_DAILY_SALT || 'fundingscout-default-salt-set-env-var'
  const day = new Date().toISOString().slice(0, 10)
  return createHash('sha256').update(`${ip}|${userAgent}|${day}|${salt}`).digest('hex').slice(0, 32)
}
