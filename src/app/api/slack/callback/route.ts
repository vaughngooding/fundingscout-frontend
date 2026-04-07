import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/slack/callback?code=...
// OAuth callback from Slack — exchanges code for bot token, stores in user_preferences.

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(new URL('/settings?slack=error', req.url))
  }

  const clientId = process.env.SLACK_CLIENT_ID
  const clientSecret = process.env.SLACK_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    console.error('Missing SLACK_CLIENT_ID or SLACK_CLIENT_SECRET')
    return NextResponse.redirect(new URL('/settings?slack=error', req.url))
  }

  // Exchange code for access token
  const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://fundingscout.io'}/api/slack/callback`,
    }).toString(),
  })

  const tokenData = await tokenRes.json()

  if (!tokenData.ok) {
    console.error(`Slack OAuth error: ${tokenData.error}`)
    return NextResponse.redirect(new URL('/settings?slack=error', req.url))
  }

  const botToken = tokenData.access_token
  const teamId = tokenData.team?.id
  const channelId = tokenData.incoming_webhook?.channel_id || null

  // Get the authenticated user
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Store Slack app credentials
  const { error } = await supabase
    .from('user_preferences')
    .upsert(
      {
        user_id: user.id,
        slack_team_id: teamId,
        slack_channel_id: channelId,
        slack_bot_token: botToken,
        slack_app_installed: true,
      },
      { onConflict: 'user_id' },
    )

  if (error) {
    console.error(`Failed to store Slack credentials: ${error.message}`)
    return NextResponse.redirect(new URL('/settings?slack=error', req.url))
  }

  return NextResponse.redirect(new URL('/settings?slack=connected', req.url))
}
