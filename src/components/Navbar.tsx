'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null)
  const [plan, setPlan] = useState<'free' | 'pro' | null>(null)
  const [upgrading, setUpgrading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()

  useEffect(() => {
    async function loadUserAndPlan() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('plan')
          .eq('id', user.id)
          .single()
        setPlan((profile?.plan as 'free' | 'pro') || 'free')
      }
    }
    loadUserAndPlan()
  }, [supabase])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  async function handleUpgrade() {
    setUpgrading(true)
    try {
      const res = await fetch('/api/create-checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to start checkout')
        setUpgrading(false)
      }
    } catch {
      alert('Network error. Please try again.')
      setUpgrading(false)
    }
  }

  function isActive(path: string) {
    return pathname === path || pathname.startsWith(path + '/')
  }

  const navLinks = [
    { href: '/explore', label: 'Explore' },
    { href: '/dashboard', label: 'My Alerts' },
    { href: '/bookmarks', label: 'Bookmarks' },
    { href: '/settings', label: 'Settings' },
  ]

  return (
    <nav className="sticky top-0 z-30 border-b border-neutral-100 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between">
          {/* Left: Logo + Nav links */}
          <div className="flex items-center gap-8">
            <Link href="/dashboard" className="flex items-center">
              <span className="text-xl font-extrabold tracking-tight">
                <span className="text-emerald-600">Funding</span>
                <span className="text-neutral-950">Scout</span>
              </span>
            </Link>

            {/* Desktop nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    isActive(link.href)
                      ? 'bg-neutral-100 text-neutral-950'
                      : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Right: Upgrade CTA + User info + logout */}
          <div className="hidden md:flex items-center gap-3">
            {plan === 'free' && (
              <button
                onClick={handleUpgrade}
                disabled={upgrading}
                className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)] transition-all hover:bg-emerald-500 hover:shadow-[0_8px_20px_-6px_rgba(16,185,129,0.6)] disabled:opacity-50"
              >
                {upgrading ? 'Loading…' : 'Upgrade to Pro'}
              </button>
            )}
            {plan === 'pro' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
                <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/></svg>
                Pro
              </span>
            )}
            {user && (
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900">
                  <span className="text-xs font-bold text-white">
                    {(user.email?.[0] || 'U').toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-neutral-700 max-w-[180px] truncate hidden lg:inline">
                  {user.email}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="rounded-full px-3 py-2 text-sm font-medium text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
            >
              Log out
            </button>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="md:hidden rounded-full p-2 text-neutral-600 hover:bg-neutral-100"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {menuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-neutral-100 py-3 space-y-1">
            {plan === 'free' && (
              <button
                onClick={() => {
                  setMenuOpen(false)
                  handleUpgrade()
                }}
                disabled={upgrading}
                className="mb-2 w-full rounded-full bg-emerald-600 px-3 py-3 text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)] disabled:opacity-50"
              >
                {upgrading ? 'Loading…' : 'Upgrade to Pro'}
              </button>
            )}
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className={`block rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${
                  isActive(link.href)
                    ? 'bg-neutral-100 text-neutral-950'
                    : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-950'
                }`}
              >
                {link.label}
              </Link>
            ))}

            {user && (
              <div className="pt-3 mt-3 border-t border-slate-700/50">
                <div className="flex items-center gap-3 px-3 py-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-neutral-900">
                    <span className="text-xs font-bold text-white">
                      {(user.email?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                  <span className="truncate text-sm font-medium text-neutral-700">
                    {user.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
