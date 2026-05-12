import { describe, it, expect } from 'vitest'
import { __testHelpers } from '../funding-rounds'

const { encodeCursor, decodeCursor } = __testHelpers

describe('cursor encoding/decoding (opaque base64url)', () => {
  it('round-trips a typical cursor with date + id', () => {
    const cursor = encodeCursor({ d: '2026-05-01T10:00:00.000Z', i: 'abc-123' })
    expect(decodeCursor(cursor)).toEqual({
      d: '2026-05-01T10:00:00.000Z',
      i: 'abc-123',
    })
  })

  it('round-trips a cursor with null date (older rows)', () => {
    const cursor = encodeCursor({ d: null, i: 'xyz' })
    expect(decodeCursor(cursor)).toEqual({ d: null, i: 'xyz' })
  })

  it('returns null for malformed input', () => {
    expect(decodeCursor('not-a-real-cursor!@#$')).toBeNull()
    expect(decodeCursor('')).toBeNull()
    expect(decodeCursor(null)).toBeNull()
    expect(decodeCursor(undefined)).toBeNull()
  })

  it('returns null when decoded JSON is missing required `i` field', () => {
    // Manually craft an invalid cursor (missing `i`)
    const malformed = Buffer.from(JSON.stringify({ d: '2026-01-01' }), 'utf-8').toString('base64url')
    expect(decodeCursor(malformed)).toBeNull()
  })

  it('produces URL-safe output (base64url, no +/= chars)', () => {
    const cursor = encodeCursor({ d: '2026-01-01T00:00:00.000Z', i: 'aaa' })
    expect(cursor).not.toMatch(/[+/=]/)
  })
})
