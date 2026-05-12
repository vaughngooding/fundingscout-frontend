'use client'

/**
 * API Keys management section, rendered inside /settings for Pro users.
 *
 * Behaviour:
 *   - Lists active + revoked keys (prefix only).
 *   - "Create new key" opens a modal that prompts for a name, POSTs to
 *     /api/v1/keys, and shows the full key ONCE with a copy button.
 *   - "Revoke" calls PATCH /api/v1/keys/[id] with { revoked: true }.
 *
 * Pro-gating happens server-side in the API routes; this component is
 * conditionally rendered only when the parent passes `isPro={true}`. We
 * keep a defensive client-side check so a non-Pro user who somehow lands
 * here doesn't see a confusing empty state.
 */

import { useCallback, useEffect, useState } from 'react'

interface KeyRow {
  id: string
  name: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
}

interface Props {
  isPro: boolean
}

const MCP_INSTALL_CMD = (key: string) =>
  `claude mcp add --transport http fundingscout https://fundingscout.io/mcp --header "Authorization: Bearer ${key}"`

export default function ApiKeysSection({ isPro }: Props) {
  const [keys, setKeys] = useState<KeyRow[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [createInFlight, setCreateInFlight] = useState(false)
  const [copyStatus, setCopyStatus] = useState<'idle' | 'copied'>('idle')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/keys')
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.message || `Failed to load keys (HTTP ${res.status})`)
        setKeys([])
        return
      }
      const data = (await res.json()) as { keys: KeyRow[] }
      setKeys(data.keys)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
      setKeys([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isPro) void load()
    else setLoading(false)
  }, [isPro, load])

  async function handleCreate() {
    if (!newKeyName.trim()) return
    setCreateInFlight(true)
    setError(null)
    try {
      const res = await fetch('/api/v1/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newKeyName.trim() }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(body.message || `Failed to create key (HTTP ${res.status})`)
        return
      }
      setCreatedKey(body.key.full_key)
      setNewKeyName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    } finally {
      setCreateInFlight(false)
    }
  }

  async function handleRevoke(id: string) {
    if (!confirm('Revoke this key? Any Claude Code session using it will stop working.')) return
    try {
      const res = await fetch(`/api/v1/keys/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revoked: true }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError(body.message || `Failed to revoke (HTTP ${res.status})`)
        return
      }
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Network error')
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopyStatus('copied')
      setTimeout(() => setCopyStatus('idle'), 1500)
    } catch {
      // Some browsers block writeText outside a secure context — fall back to
      // showing the text for manual copy.
      setCopyStatus('idle')
    }
  }

  if (!isPro) {
    return (
      <section className="bg-slate-900 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-2">API Keys</h2>
        <p className="text-sm text-slate-400 mb-4">
          API access (REST + Claude Code MCP at <span className="font-mono text-slate-300">fundingscout.io/mcp</span>) is a Pro feature.
        </p>
        <a
          href="/onboarding?step=plan"
          className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition-colors"
        >
          Upgrade to Pro
        </a>
      </section>
    )
  }

  return (
    <section className="bg-slate-900 border border-slate-700/50 rounded-xl p-6">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h2 className="text-lg font-semibold text-white">API Keys</h2>
          <p className="text-sm text-slate-400 mt-1">
            Use with the FundingScout MCP in Claude Code or the REST API directly.
            Keep keys secret — anyone with a key can query rounds and reveal CEO contacts under your quota.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setCreating(true)
            setCreatedKey(null)
            setNewKeyName('')
          }}
          className="flex-shrink-0 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
        >
          Create new key
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : !keys || keys.length === 0 ? (
        <p className="text-sm text-slate-500">
          No API keys yet. Click <strong className="text-slate-300">Create new key</strong> to get started.
        </p>
      ) : (
        <ul className="divide-y divide-slate-800 -mx-2">
          {keys.map((k) => (
            <li key={k.id} className="flex items-center justify-between px-2 py-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white truncate">{k.name}</span>
                  {k.revoked_at ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300">
                      revoked
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                      active
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 font-mono">{k.prefix}…</div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Created {new Date(k.created_at).toLocaleDateString()}
                  {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                </div>
              </div>
              {!k.revoked_at && (
                <button
                  type="button"
                  onClick={() => handleRevoke(k.id)}
                  className="ml-4 flex-shrink-0 text-sm text-slate-400 hover:text-red-300 transition-colors"
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-4 text-xs text-slate-500">
        See <a href="/docs/mcp" className="text-emerald-400 hover:underline">/docs/mcp</a> for setup instructions and quota rules.
      </p>

      {/* Create-key modal */}
      {creating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 max-w-md w-full shadow-2xl">
            {!createdKey ? (
              <>
                <h3 className="text-lg font-semibold text-white mb-1">Create API key</h3>
                <p className="text-sm text-slate-400 mb-4">
                  Give it a name so you can identify it later. The full key will be shown ONCE.
                </p>
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g. Claude Code laptop"
                  maxLength={60}
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-white placeholder-slate-500 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newKeyName.trim() && !createInFlight) {
                      void handleCreate()
                    }
                  }}
                />
                <div className="flex justify-end gap-2 mt-5">
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCreate}
                    disabled={!newKeyName.trim() || createInFlight}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {createInFlight ? 'Creating…' : 'Create'}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-white mb-1">Key created</h3>
                <p className="text-sm text-amber-300 mb-4">
                  Copy this now — it won&apos;t be shown again.
                </p>
                <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-xs text-emerald-300 break-all select-all">
                  {createdKey}
                </div>
                <button
                  type="button"
                  onClick={() => copyToClipboard(createdKey)}
                  className="mt-3 w-full px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors"
                >
                  {copyStatus === 'copied' ? '✓ Copied' : 'Copy key'}
                </button>

                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
                    Connect to Claude Code
                  </p>
                  <div className="rounded-lg border border-slate-700 bg-slate-950 p-3 font-mono text-[11px] text-slate-300 break-all select-all">
                    {MCP_INSTALL_CMD(createdKey)}
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(MCP_INSTALL_CMD(createdKey))}
                    className="mt-2 w-full px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium transition-colors"
                  >
                    Copy install command
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreating(false)
                    setCreatedKey(null)
                  }}
                  className="mt-5 w-full px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
