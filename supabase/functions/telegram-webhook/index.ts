// supabase/functions/telegram-webhook/index.ts
// Receives POST from Telegram when a user sends /start {token}
// Links the Telegram chat to the FundingScout user account.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface TelegramUpdate {
  message?: {
    chat: { id: number; first_name?: string }
    text?: string
    from?: { id: number; first_name?: string; username?: string }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    if (!botToken) {
      throw new Error('Missing TELEGRAM_BOT_TOKEN')
    }

    const update: TelegramUpdate = await req.json()
    const message = update.message

    // Only process text messages
    if (!message?.text) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const chatId = message.chat.id
    const text = message.text.trim()

    // Handle /start {token} command
    if (text.startsWith('/start')) {
      const parts = text.split(' ')
      const token = parts[1]

      if (!token) {
        // No token provided — send instructions
        await sendTelegramMessage(
          botToken,
          chatId,
          'Welcome to FundingScout! To connect your account, use the "Connect Telegram" button in your FundingScout settings.',
        )
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Look up the token in user_preferences
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!
      const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      const supabase = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })

      const { data: pref, error: lookupError } = await supabase
        .from('user_preferences')
        .select('user_id, telegram_link_token')
        .eq('telegram_link_token', token)
        .single()

      if (lookupError || !pref) {
        await sendTelegramMessage(
          botToken,
          chatId,
          'Invalid or expired link token. Please generate a new one from your FundingScout settings.',
        )
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      // Store chat ID and clear the token
      const { error: updateError } = await supabase
        .from('user_preferences')
        .update({
          telegram_chat_id: chatId,
          telegram_link_token: null,
        })
        .eq('user_id', pref.user_id)

      if (updateError) {
        console.error(`Failed to link Telegram: ${updateError.message}`)
        await sendTelegramMessage(
          botToken,
          chatId,
          'Something went wrong linking your account. Please try again.',
        )
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      await sendTelegramMessage(
        botToken,
        chatId,
        'Your Telegram is now connected to FundingScout! You will receive funding alerts here.',
      )

      return new Response(JSON.stringify({ ok: true, linked: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Unknown command — send help
    await sendTelegramMessage(
      botToken,
      chatId,
      'FundingScout Bot — I deliver real-time funding alerts. Connect your account at https://fundingscout.io/settings',
    )

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`telegram-webhook error: ${message}`)
    // Return 200 to Telegram to prevent retries
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})

async function sendTelegramMessage(
  botToken: string,
  chatId: number,
  text: string,
): Promise<void> {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error(`Telegram sendMessage failed: ${response.status} - ${body}`)
  }
}
