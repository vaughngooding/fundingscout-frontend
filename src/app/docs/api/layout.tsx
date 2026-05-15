import Link from 'next/link'
import type { ReactNode } from 'react'
import DocsSidebar from './DocsSidebar'

/**
 * Layout for the multi-page CRM Match API docs.
 *
 * Structure:
 *   ┌────────────────────────────────────────┐
 *   │ Top nav (logo + sign in + get started) │
 *   ├──────────────┬─────────────────────────┤
 *   │              │                         │
 *   │  Sidebar     │  Page content           │
 *   │  (sticky)    │                         │
 *   │              │                         │
 *   └──────────────┴─────────────────────────┘
 *
 * Sidebar is a client component so the active link can highlight; the rest
 * is server-rendered with no JS payload.
 */
export default function ApiDocsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-900 text-white antialiased">
      {/* Top nav */}
      <nav className="sticky top-0 z-50 w-full border-b border-slate-800 bg-slate-900/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-xl font-extrabold tracking-tight">
              <span className="text-emerald-400">Funding</span>
              <span className="text-white">Scout</span>
            </Link>
            <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 sm:inline">
              Developer Docs
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3">
            <Link
              href="/docs/mcp"
              className="rounded-full px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              MCP
            </Link>
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-sm font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
            >
              Sign in
            </Link>
            <Link
              href="/signup?plan=trial"
              className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-emerald-500"
            >
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* Body grid: sidebar + content */}
      <div className="mx-auto max-w-7xl px-6 py-10 sm:py-14">
        <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
          <aside>
            <div className="sticky top-24">
              <DocsSidebar />
            </div>
          </aside>

          <main className="min-w-0">
            <article className="prose-invert prose-headings:text-white prose-a:text-emerald-400 max-w-none">
              {children}
            </article>
          </main>
        </div>
      </div>
    </div>
  )
}
