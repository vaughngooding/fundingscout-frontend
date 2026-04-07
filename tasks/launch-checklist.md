# FundingScout Launch Checklist (2026-04-07)

This is YOUR todo list — manual steps the assistant can't automate. Work through them in roughly the order shown. Things marked **(parallel)** can be started early and run in the background.

---

## ✅ Already done (assistant did these autonomously)

- [x] Rebrand FundingPulse → FundingScout in all code (frontend + engine)
- [x] iMessage SQL migration written (`supabase/migrations/20260406_imessage.sql`)
- [x] `imessage_enabled` field added to TypeScript types
- [x] verify-phone API rewritten to use Twilio Verify API (no A2P 10DLC needed)
- [x] Settings UI: SMS section relabeled "Phone Notifications," iMessage checkbox added (default ON), SMS marked "coming soon"
- [x] **Upgrade to Pro button now actually works** (was a dead button — critical bug fix)
- [x] `imessage_dispatcher.py` written (Mac polls Supabase, sends via osascript)
- [x] `run_fast.py` updated to call the dispatcher each cron run
- [x] Engine temp file paths renamed `/tmp/fundingpulse*` → `/tmp/fundingscout*`
- [x] Twitter handle reference updated to `@fundingscoutapp` in code
- [x] TypeScript compiles, Next.js build passes

## ⏳ Things YOU need to do

### 1. Porkbun DNS for fundingscout.io **(parallel — start FIRST, longest wait)**

- [ ] Vercel dashboard → fundingscout project → Settings → Domains → Add `fundingscout.io`
- [ ] Also add `www.fundingscout.io` and configure redirect to apex
- [ ] Vercel will show you the required DNS records — should be:
  - **A record** for `@`: `76.76.21.21`
  - **CNAME** for `www`: `cname.vercel-dns.com`
- [ ] In Porkbun → Domain Management → fundingscout.io → DNS:
  - Delete the default Porkbun parking records
  - Add the A record + CNAME above (TTL: 600)
  - **OR** use Porkbun's built-in "Vercel ALIAS" preset under "Hosting" if visible
- [ ] Wait 5-15 min, refresh Vercel domains page until status flips to "Valid Configuration"
- [ ] Hit `https://fundingscout.io` in browser to verify HTTPS cert is auto-issued

### 2. Resend domain verification **(parallel — also long wait)**

- [ ] Sign up at https://resend.com
- [ ] Domains → Add Domain → `fundingscout.io`
- [ ] Resend will show 3-4 DNS records (DKIM, SPF, return-path) — add them in Porkbun (same DNS panel)
- [ ] Wait for verification (5-15 min, sometimes longer)
- [ ] API Keys → Create → copy the `re_...` key (you'll need it in step 6)

### 3. Twilio Verify API setup **(~5 min, no A2P 10DLC needed)**

- [ ] Sign up at https://twilio.com (free trial gives ~$15 credit)
- [ ] Console → Verify → Services → Create new Service → name "FundingScout Phone Verify"
- [ ] Copy the **Service SID** (`VA...`)
- [ ] Console → Account → API keys & tokens → copy **Account SID** (`AC...`) and **Auth Token**

### 4. Stripe live mode keys

- [ ] Stripe Dashboard → toggle to **Live Mode** (top right)
- [ ] Developers → API Keys → reveal `sk_live_...` → copy
- [ ] Products → find your $49/mo Pro product → copy the **Price ID** (`price_...`, NOT `prod_...`)
- [ ] Developers → Webhooks → Add endpoint:
  - URL: `https://enbinbvpvsbmjdcbcigc.supabase.co/functions/v1/stripe-webhook`
  - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- [ ] After creating, reveal the **Signing Secret** (`whsec_...`) → copy

### 5. Slack app — update OAuth redirect URI

- [ ] https://api.slack.com/apps → open the FundingPulse app (will rename below)
- [ ] OAuth & Permissions → Redirect URLs:
  - **ADD** `https://fundingscout.io/api/slack/callback`
  - **KEEP** `https://funding-pulse.vercel.app/api/slack/callback` for now (rollback safety)
- [ ] Save
- [ ] Basic Information → App Name → rename to "FundingScout" (cosmetic)

### 6. Set Supabase edge function secrets

Once you have keys from steps 2/3/4, run these on your local terminal (you need `supabase` CLI installed and logged in):

```bash
cd "/Users/vaughngooding/Vibecoding/Vibecoding/funding-pulse"

# Stripe (live)
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_xxx
supabase secrets set STRIPE_PRO_PRICE_ID=price_xxx

# Resend
supabase secrets set RESEND_API_KEY=re_xxx
supabase secrets set APP_BASE_URL=https://fundingscout.io

# Twilio Verify (used by /api/verify-phone in Next.js, but also good to have here)
supabase secrets set TWILIO_ACCOUNT_SID=ACxxx
supabase secrets set TWILIO_AUTH_TOKEN=xxx
supabase secrets set TWILIO_VERIFY_SERVICE_SID=VAxxx

# Web Push (generate first)
npx web-push generate-vapid-keys
# copy public + private keys from output, then:
supabase secrets set VAPID_PUBLIC_KEY=xxx VAPID_PRIVATE_KEY=xxx

# Telegram (only if you already have a bot token from BotFather)
supabase secrets set TELEGRAM_BOT_TOKEN=xxx

# Slack OAuth (from api.slack.com app config)
supabase secrets set SLACK_CLIENT_ID=xxx SLACK_CLIENT_SECRET=xxx SLACK_SIGNING_SECRET=xxx
```

### 7. Set Vercel env vars (Production scope)

Vercel → fundingscout → Settings → Environment Variables. Add for **Production**:

- `NEXT_PUBLIC_SITE_URL` = `https://fundingscout.io`
- `STRIPE_SECRET_KEY` = `sk_live_...`
- `STRIPE_PRO_PRICE_ID` = `price_...`
- `TWILIO_ACCOUNT_SID` = `AC...`
- `TWILIO_AUTH_TOKEN` = `...`
- `TWILIO_VERIFY_SERVICE_SID` = `VA...`
- `NEXT_PUBLIC_SLACK_CLIENT_ID` = (same as SLACK_CLIENT_ID)

After saving, Vercel will auto-redeploy.

### 8. Apply database migrations to Supabase

```bash
cd "/Users/vaughngooding/Vibecoding/Vibecoding/funding-pulse"
supabase db push
```

This applies BOTH:
- `20260226_multi_channel_notifications.sql` (Telegram, Web Push, SMS, Slack App columns)
- `20260406_imessage.sql` (NEW — iMessage columns)

If `supabase db push` doesn't work or you'd rather paste manually: open Supabase dashboard → SQL Editor → copy-paste the contents of each migration file → Run.

### 9. Deploy edge functions

```bash
cd "/Users/vaughngooding/Vibecoding/Vibecoding/funding-pulse"
supabase functions deploy send-webhooks
supabase functions deploy send-daily-digest
supabase functions deploy telegram-webhook
supabase functions deploy slack-interactions
supabase functions deploy stripe-webhook
```

### 10. Update Supabase auth `site_url`

Critical — auth emails (signup confirmation, magic links, password reset) embed `site_url` in their links.

- Supabase dashboard → Project Settings → Authentication → URL Configuration
- Site URL → `https://fundingscout.io`
- Redirect URLs → add `https://fundingscout.io/**` and `https://fundingscout.io/auth/callback`
- Keep `https://funding-pulse.vercel.app/**` as a second entry temporarily

### 11. Mac Mini iMessage setup (manual, ~5 min)

- [ ] Open Messages.app on the Mac Mini → Settings → iMessage → confirm signed in with your personal Apple ID, at least one "Send & receive at" address checked
- [ ] Send a manual test message from Messages.app to your own phone — verify it's a **blue bubble** (not green = SMS = iMessage not active)
- [ ] Open Terminal and run: `osascript -e 'tell application "Messages" to count of services'`
  - macOS will prompt for Automation permission → **Allow**
- [ ] System Settings → Lock Screen → "Turn display off when inactive: Never" + Battery → "Prevent automatic sleeping" → ON
- [ ] **One-time cleanup** of stale dedupe cache (old path):
  ```bash
  rm /tmp/fundingpulse-seen-urls.json
  ```
  (Next cron run will create `/tmp/fundingscout-seen-urls.json` fresh. Articles already in Supabase won't double-insert because of unique constraints on `article_url`.)

### 12. Twitter handle keys

- [ ] Confirm `~/Vibecoding/Vibecoding/Funding Alerts/.env` Twitter API keys are for `@fundingscoutapp`, NOT the old `@FundingPulse` account
- [ ] If they're for the old account: regenerate at https://developer.x.com under the @fundingscoutapp developer account, paste into `.env`

### 13. Commit the work

```bash
cd "/Users/vaughngooding/Vibecoding/Vibecoding/funding-pulse"
git add -A
git status   # review what's about to be committed
git commit -m "feat: rebrand to FundingScout, iMessage channel, Twilio Verify, fix Upgrade button"
git push origin main
```

Vercel auto-deploys from `main` push. Watch the build at https://vercel.com/dashboard

---

## 🧪 Verification (after everything above is done)

1. **Domain works**
   - [ ] `https://fundingscout.io` loads, shows "FundingScout" branding
   - [ ] HTTPS cert valid (no warnings)
   - [ ] `https://www.fundingscout.io` redirects to apex

2. **Auth flow**
   - [ ] Sign up with a fresh email
   - [ ] Confirmation email arrives, from-address contains `fundingscout`
   - [ ] Click confirmation link → land on dashboard

3. **Stripe (use a real card, you can refund yourself)**
   - [ ] Settings → "Upgrade to Pro" → Stripe Checkout opens
   - [ ] Complete a real $49 charge
   - [ ] Profile flips to `pro` within 30 sec (refresh dashboard)
   - [ ] Stripe Dashboard → Webhooks → recent deliveries → 200 OK
   - [ ] Refund the test charge

4. **Phone verification**
   - [ ] Settings → enter your phone → "Send Code"
   - [ ] Receive 6-digit code via SMS (Twilio Verify)
   - [ ] Enter code → "Verify"
   - [ ] "Verified" badge shows, "Notify via iMessage (free)" checkbox is checked by default
   - [ ] Click Save Settings

5. **iMessage end-to-end**
   - [ ] Wait for next funding round to be inserted (or manually trigger one in Supabase)
   - [ ] Within ~1 minute, blue-bubble iMessage arrives on your phone
   - [ ] Check Supabase: `SELECT id, imessage_sent_at FROM user_alerts ORDER BY created_at DESC LIMIT 5`
   - [ ] `imessage_sent_at` should be populated for the row you just received

6. **Cron pipeline**
   - [ ] `tail -f /tmp/fundingscout.log` shows fresh runs every minute
   - [ ] No "FundingPulse pipeline FAILED" alerts in Slack/ntfy

7. **Daily digest (manual trigger to test before tomorrow morning)**
   ```bash
   curl -X POST https://enbinbvpvsbmjdcbcigc.supabase.co/functions/v1/send-daily-digest \
     -H "Authorization: Bearer $SUPABASE_SERVICE_KEY"
   ```
   - [ ] Email arrives from `alerts@fundingscout.io`
   - [ ] Header says "FundingScout"

---

## 🚨 If something goes wrong

- **DNS not propagating after 30 min:** check Porkbun for typos, try `dig fundingscout.io @1.1.1.1` to confirm what's resolving
- **Stripe webhook signature failing:** make sure `STRIPE_WEBHOOK_SECRET` matches the one Stripe shows in the webhook details (live mode, not test mode)
- **iMessage osascript errors:** check `/tmp/fundingscout.log` for "not authorized to send Apple events" — fix at System Settings → Privacy & Security → Automation → cron → check Messages
- **Twilio Verify "Cannot deliver to unverified number":** Twilio trial accounts can only send to numbers you've added as verified caller IDs in the Twilio console. Add your test number there, OR upgrade Twilio out of trial mode (the $15 credit covers it).
- **Upgrade button does nothing:** check browser console for errors, verify `STRIPE_SECRET_KEY` and `STRIPE_PRO_PRICE_ID` are set in Vercel env vars (Production scope)

---

## Cut lines (if running short on time tomorrow)

Drop these in this order, lowest pain first:

1. **Resend / email digests** — daily digest just doesn't fire. Slack/Telegram/iMessage all still work.
2. **Telegram bot rename** — `@FundingPulseBot` keeps working, users see old name in the link only.
3. **Stripe live mode** — keep test mode for soft launch, flip to live when ready.

Do NOT cut: rebrand, domain, iMessage, Upgrade button fix.
