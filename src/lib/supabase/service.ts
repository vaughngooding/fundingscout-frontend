import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * Service-role Supabase client. Bypasses RLS.
 *
 * Use ONLY inside API routes that have already verified the caller's identity
 * (e.g. Supabase Auth cookie OR validated fs_api_keys lookup). Never expose
 * data fetched with this client to the browser without a Pro-gate check —
 * the entire point of RLS is gone here.
 */
export function createServiceClient(): SupabaseClient {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
