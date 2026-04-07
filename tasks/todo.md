# Multi-Channel Notification Expansion

## Phase 1: Telegram Bot
- [x] Update `types.ts` — add telegram fields to UserPreferences
- [x] Create SQL migration for telegram columns
- [x] Create `telegram-webhook/index.ts` edge function
- [x] Modify `send-webhooks/index.ts` — add Telegram dispatcher
- [x] Update `SettingsForm.tsx` — add Telegram section
- [x] Update `settings/page.tsx` — pass new fields

## Phase 2: Web Push
- [x] Update `types.ts` — add push_subscription + PushSubscriptionJSON
- [x] Create SQL migration for push_subscription column
- [x] Create `public/sw.js` service worker
- [x] Create `public/manifest.json`
- [x] Update `layout.tsx` — add manifest link + theme-color meta
- [x] Update dashboard `layout.tsx` — register service worker
- [x] Modify `send-webhooks/index.ts` — add Web Push sender with VAPID JWT
- [x] Update `SettingsForm.tsx` — add Push Notifications section

## Phase 3: Twilio SMS
- [x] Update `types.ts` — add phone fields
- [x] Create SQL migration for phone columns
- [x] Create `api/verify-phone/route.ts` (send + confirm actions)
- [x] Modify `send-webhooks/index.ts` — add SMS sender
- [x] Update `SettingsForm.tsx` — add SMS section with verification flow

## Phase 4: Full Slack App
- [x] Update `types.ts` — add Slack app fields
- [x] Create SQL migration for slack app columns
- [x] Create `api/slack/callback/route.ts` — OAuth code exchange
- [x] Create `slack-interactions/index.ts` edge function — /funding + interactive buttons
- [x] Modify `send-webhooks/index.ts` — add Slack app chat.postMessage with Block Kit
- [x] Update `SettingsForm.tsx` — Add to Slack button + webhook fallback

## Verification
- [x] TypeScript compilation passes (`tsc --noEmit`)
- [x] Next.js build succeeds (`next build`)
- [x] All API routes registered correctly
- [x] Free plan gating via ProGate wrapper on all channel sections

## Review
- [x] All 4 phases implemented
- [x] Types consistent across frontend and edge functions
- [x] Error handling with try/catch in all channel dispatchers
- [x] Alert marked `sent` if ANY channel succeeds (dispatcher pattern)
- [x] Expired push subscriptions auto-cleaned (410 handling)
- [x] Slack App takes priority over webhook, falls back gracefully
