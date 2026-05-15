'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

// Source of truth for the sidebar. Adding a new doc page = add an entry here.
const SECTIONS = [
  {
    heading: 'Getting started',
    items: [
      { href: '/docs/api', label: 'Overview' },
      { href: '/docs/api/quickstart', label: 'Quickstart' },
      { href: '/docs/api/authentication', label: 'Authentication' },
    ],
  },
  {
    heading: 'Resources',
    items: [
      { href: '/docs/api/accounts', label: 'Accounts' },
      { href: '/docs/api/contacts', label: 'Contacts' },
      { href: '/docs/api/webhooks', label: 'Webhooks' },
      { href: '/docs/api/matches', label: 'Matches' },
    ],
  },
  {
    heading: 'Reference',
    items: [
      { href: '/docs/api/match-logic', label: 'How matches work' },
      { href: '/docs/api/errors', label: 'Errors' },
    ],
  },
] as const

export default function DocsSidebar() {
  const pathname = usePathname() || ''
  return (
    <nav className="space-y-6 text-sm">
      {SECTIONS.map((section) => (
        <div key={section.heading}>
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            {section.heading}
          </p>
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const isActive =
                item.href === '/docs/api'
                  ? pathname === '/docs/api'
                  : pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block rounded-md px-3 py-1.5 transition-colors ${
                      isActive
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <div className="mt-8 rounded-xl border border-slate-800 bg-slate-950/50 p-4 text-xs text-slate-400">
        <p className="font-semibold text-white">Need a key?</p>
        <p className="mt-1">
          Pro users generate keys at{' '}
          <Link href="/settings" className="text-emerald-400 underline">
            Settings → API Keys
          </Link>
          .
        </p>
      </div>
    </nav>
  )
}
