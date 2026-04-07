import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AlertCard from '@/components/AlertCard'
import type { UserAlert, Profile } from '@/lib/types'

// Always fetch fresh — never serve a cached version. The plan status drives
// whether the Pro upgrade prompt or the bookmarks list is shown.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function BookmarksPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile to check plan
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const typedProfile = profile as Profile | null

  // Free users see an upgrade prompt
  if (typedProfile?.plan === 'free') {
    return (
      <div className="max-w-xl mx-auto text-center py-20">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-500/10 mb-6">
          <svg
            className="w-8 h-8 text-amber-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Bookmarks are a Pro feature
        </h1>
        <p className="text-slate-400 mb-6 max-w-md mx-auto">
          Save and organize the most promising funding rounds for your outreach.
          Upgrade to Pro to unlock bookmarks, Slack/Teams integrations, and
          unlimited alerts.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors"
        >
          Upgrade to Pro
        </Link>
      </div>
    )
  }

  // Pro users: fetch bookmarked alerts
  const { data: bookmarks, error } = await supabase
    .from('user_alerts')
    .select(
      `
      *,
      funding_round:funding_rounds(*)
    `
    )
    .eq('user_id', user.id)
    .eq('is_bookmarked', true)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching bookmarks:', error)
  }

  const typedBookmarks = (bookmarks as UserAlert[]) || []

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Bookmarks</h1>
        <p className="text-sm text-slate-400 mt-1">
          {typedBookmarks.length} saved funding round
          {typedBookmarks.length !== 1 ? 's' : ''}
        </p>
      </div>

      {typedBookmarks.length > 0 ? (
        <div className="grid gap-4 max-w-3xl">
          {typedBookmarks.map((alert) => (
            <AlertCard key={alert.id} alert={alert} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-4">
            <svg
              className="w-8 h-8 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-1">
            No bookmarks yet
          </h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            Star funding rounds from your dashboard to save them here for easy
            access during your outreach.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-sm font-medium border border-slate-700 transition-colors"
          >
            Go to Dashboard
          </Link>
        </div>
      )}
    </div>
  )
}
