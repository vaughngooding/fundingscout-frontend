import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/Navbar'

// Force fresh server render on every request — never serve a cached layout.
// Without this, Next.js can serve a stale layout that shows the user as Free
// even after the Stripe webhook flips them to Pro in the database.
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
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

  return (
    <div className="min-h-screen bg-white text-neutral-900 antialiased">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 text-neutral-900">
        {children}
      </main>
      {/* Inject profile data for client components via data attribute */}
      <script
        id="__profile_data"
        type="application/json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(profile),
        }}
      />
      {/* Register service worker for Web Push notifications */}
      <script
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').catch(function(err) {
                console.warn('SW registration failed:', err);
              });
            }
          `,
        }}
      />
    </div>
  )
}
