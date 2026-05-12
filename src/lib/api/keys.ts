/**
 * API key generation, hashing, and CRUD helpers.
 *
 * Token format:  fs_live_<32 base62 chars>   (total 40 chars)
 *
 * Storage model:
 *   - The full token is shown to the user ONCE at creation. Never stored.
 *   - sha256(full_token) is stored in fs_api_keys.key_hash.
 *   - The first 12 chars (prefix) are stored separately for UI display
 *     ("fs_live_a1b2..." in the keys list).
 *
 * The MCP/REST middleware does the inverse: take Bearer token → sha256 →
 * lookup row by key_hash → join to profile → Pro-gate.
 */

import { createHash, randomBytes } from 'node:crypto'
import { createServiceClient } from '@/lib/supabase/service'

export const KEY_PREFIX = 'fs_live_'
const TOKEN_RANDOM_BYTES = 32 // 32 base62 chars after encoding; ~190 bits entropy

const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'

function bytesToBase62(buf: Buffer): string {
  // Simple base-62: process each byte mod 62. Not cryptographically uniform
  // across 62, but the input is already cryptographically random so the
  // resulting key is just as random as the input bytes.
  let out = ''
  for (const b of buf) out += BASE62[b % 62]
  return out
}

export interface GeneratedKey {
  /** Show this to the user ONCE, then forget it. */
  fullKey: string
  /** Stored on the row. */
  keyHash: string
  /** Stored separately for UI display (and the unique prefix shown to users). */
  prefix: string
}

export function generateApiKey(): GeneratedKey {
  const random = randomBytes(TOKEN_RANDOM_BYTES)
  const fullKey = KEY_PREFIX + bytesToBase62(random)
  const keyHash = createHash('sha256').update(fullKey).digest('hex')
  // 12-char prefix is enough to be visually identifiable in UI but not
  // enough to brute-force the rest of the token.
  const prefix = fullKey.slice(0, 12)
  return { fullKey, keyHash, prefix }
}

export function hashApiKey(fullKey: string): string {
  return createHash('sha256').update(fullKey).digest('hex')
}

// ---------------------------------------------------------------------------
// CRUD (used by the /api/v1/keys route and the Settings UI)
// ---------------------------------------------------------------------------

export interface KeyRow {
  id: string
  user_id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

export async function listKeysForUser(userId: string): Promise<KeyRow[]> {
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('fs_api_keys')
    .select('id, user_id, name, prefix, created_at, last_used_at, revoked_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(`listKeysForUser: ${error.message}`)
  return (data || []) as KeyRow[]
}

export interface CreatedKey extends KeyRow {
  full_key: string  // ONLY returned at creation
}

export async function createKey(userId: string, name: string): Promise<CreatedKey> {
  const { fullKey, keyHash, prefix } = generateApiKey()
  const sb = createServiceClient()
  const { data, error } = await sb
    .from('fs_api_keys')
    .insert({ user_id: userId, name, prefix, key_hash: keyHash })
    .select('id, user_id, name, prefix, created_at, last_used_at, revoked_at')
    .single()
  if (error) throw new Error(`createKey: ${error.message}`)
  return { ...(data as KeyRow), full_key: fullKey }
}

export async function revokeKey(userId: string, keyId: string): Promise<void> {
  const sb = createServiceClient()
  const { error } = await sb
    .from('fs_api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', userId)        // belt-and-braces; RLS would catch this too
    .is('revoked_at', null)       // no-op if already revoked
  if (error) throw new Error(`revokeKey: ${error.message}`)
}
