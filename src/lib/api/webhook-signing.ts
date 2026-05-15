/**
 * HMAC-SHA256 signing for outbound webhook payloads.
 *
 * Why this exists: when FundingScout POSTs a match notification to a
 * customer's webhook URL, the customer needs to verify the request actually
 * came from us (not from an attacker who learned the URL). We solve this by
 * sharing a per-key secret. Every webhook body gets signed with that secret;
 * the customer recomputes the signature and compares.
 *
 * Format:
 *   Header:     X-FundingScout-Signature: sha256=<hex>
 *   Computation: hmac_sha256(webhook_secret, raw_body_bytes).toString('hex')
 *
 * The secret prefix is `fs_whsec_` so leaked secrets are visually
 * distinguishable from API keys (`fs_live_`) in logs.
 *
 * Verification example (Node.js):
 *   const expected = 'sha256=' + crypto
 *     .createHmac('sha256', WEBHOOK_SECRET)
 *     .update(rawBody)
 *     .digest('hex')
 *   if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(headerVal)))
 *     throw new Error('bad signature')
 *
 * Note: storage. v1 stores the plaintext secret in fs_api_keys.webhook_secret.
 * This is intentional and lower-bar than the API key (which is sha256-hashed)
 * because a leaked webhook secret only lets an attacker FORGE webhook calls
 * to a customer's endpoint — it does NOT grant API access. If we ever need
 * defense-in-depth, wrap the column with Supabase Vault. Document the
 * tradeoff so we don't forget.
 */

import { createHmac, randomBytes } from 'node:crypto'

export const WEBHOOK_SECRET_PREFIX = 'fs_whsec_'
const SECRET_RANDOM_BYTES = 32 // 32 base62 chars after encoding; ~190 bits entropy

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function bytesToBase62(buf: Buffer): string {
  let out = ''
  for (const b of buf) out += BASE62[b % 62]
  return out
}

export interface GeneratedWebhookSecret {
  /** Shown to the user ONCE at key creation / rotation, then forgotten. */
  fullSecret: string
  /** First 16 chars for UI display (e.g. "fs_whsec_a1b2c3d4..."). */
  prefix: string
}

export function generateWebhookSecret(): GeneratedWebhookSecret {
  const random = randomBytes(SECRET_RANDOM_BYTES)
  const fullSecret = WEBHOOK_SECRET_PREFIX + bytesToBase62(random)
  // 16-char display prefix — shows the "fs_whsec_" header plus 7 chars of body,
  // enough for visual recognition but not enough to derive the rest.
  const prefix = fullSecret.slice(0, 16)
  return { fullSecret, prefix }
}

/**
 * Compute the value of the X-FundingScout-Signature header for a given body.
 *
 * @param secret The full fs_whsec_... secret (plaintext).
 * @param body   The exact bytes that will be sent as the request body. Pass
 *               the same string you serialize for the POST — any whitespace
 *               difference breaks verification.
 * @returns      A string in the form `sha256=<hex>`.
 */
export function signWebhookPayload(secret: string, body: string): string {
  const hex = createHmac('sha256', secret).update(body, 'utf8').digest('hex')
  return `sha256=${hex}`
}
