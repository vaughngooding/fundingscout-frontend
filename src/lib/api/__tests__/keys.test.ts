import { describe, it, expect } from 'vitest'
import { generateApiKey, hashApiKey, KEY_PREFIX } from '../keys'

describe('generateApiKey', () => {
  it('returns a token with the fs_live_ prefix', () => {
    const { fullKey, prefix } = generateApiKey()
    expect(fullKey.startsWith(KEY_PREFIX)).toBe(true)
    expect(prefix).toBe(fullKey.slice(0, 12))
  })

  it('returns a 40-char token (8-char prefix + 32 base62)', () => {
    const { fullKey } = generateApiKey()
    expect(fullKey).toHaveLength(8 + 32)
  })

  it('returns base62-only characters after the prefix', () => {
    const { fullKey } = generateApiKey()
    const random = fullKey.slice(KEY_PREFIX.length)
    expect(random).toMatch(/^[0-9A-Za-z]{32}$/)
  })

  it('returns sha256 hex digest in keyHash', () => {
    const { fullKey, keyHash } = generateApiKey()
    expect(keyHash).toHaveLength(64) // 32 bytes hex
    expect(keyHash).toMatch(/^[0-9a-f]{64}$/)
    expect(hashApiKey(fullKey)).toBe(keyHash)
  })

  it('generates unique tokens each call (no global state regression)', () => {
    const a = generateApiKey()
    const b = generateApiKey()
    expect(a.fullKey).not.toBe(b.fullKey)
    expect(a.keyHash).not.toBe(b.keyHash)
  })
})

describe('hashApiKey', () => {
  it('produces stable sha256 for the same input', () => {
    const token = 'fs_live_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345'
    expect(hashApiKey(token)).toBe(hashApiKey(token))
  })

  it('differs for any change in the token (even one char)', () => {
    const a = 'fs_live_ABCDEFGHIJKLMNOPQRSTUVWXYZ012345'
    const b = 'fs_live_ABCDEFGHIJKLMNOPQRSTUVWXYZ012346'
    expect(hashApiKey(a)).not.toBe(hashApiKey(b))
  })
})
