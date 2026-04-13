# Lessons learned

## 2026-04-09 — Carpet-bomb incident (~170 duplicate iMessages shipped to ~15 users)

### What happened
Ran SEC EDGAR Form D scraper for the first time in parallel with the cron picking up newly-added PR wire RSS feeds (BusinessWire, PR Newswire, GlobeNewswire, Fierce Biotech, etc.). Within 15 minutes, ~50 funding_rounds rows were inserted and ~170 user_alerts fired, with the iMessage dispatcher delivering all of them in a 5-minute burst. Affected real users including Daanish (paying customer), Sanat at Snowflake, several LinkedIn employees, gbernstein@google, daniel.hamilton@doordash, kmoutry@google, csacco, epatton, dvklopp, sequinn — many getting 5-15 messages in 60 seconds.

### Root cause (5 compounding bugs)
1. **Google News RSS returns 7-day-old articles**, not real-time. Each cron tick discovered ~25 "new" articles that were already 1-7 days old. Catch-up content masquerading as real-time alerts.
2. **Same logical round = different DB rows.** `is_dup_round()` matched on `(company_name, amount_usd)` exact. Press articles disagree on amount ($65M closed vs $100M total for the same Stipple Bio round), so two articles → two rows.
3. **Trigger fires user_alerts on every INSERT** with no logical-dedup check. Two duplicate rows → two sets of user_alerts → users get alerted twice.
4. **No rate limiting on the dispatcher.** When the trigger created 22 user_alerts in 60 seconds, the iMessage dispatcher tried to send all of them in a 30-second burst.
5. **EDGAR runner inserted 32 catch-up rounds simultaneously.** EDGAR is a 7-day enrichment source, not real-time discovery. Each insert triggered fresh user_alerts as if they were live announcements. The runner had no way to mark its inserts as "do not alert."

### Fixes shipped (5 layers, all in place)

**L1 — Loose dedup in `is_dup_round`:** rewrote as `find_existing_logical_round(company_name)` using `_normalize_company_for_match()` (lowercase, strip Inc/LLC/Bio/Tech/etc., 14-day window). Mirror of the SQL `normalize_company_name()` function.

**L2 — `merge_into_existing_round` instead of INSERT:** when a logical match is found, fill in missing fields on the existing row (website, ceo_name, lead_investor, industry, investors, industry_tags) but NEVER touch `created_at`, `amount_usd`, or `article_url`. Honors Vaughn's principle: "the timestamp should represent the original time the funding alert FIRST came in. If we validate, modify, or add info, there shouldn't be a new alert or a change to the timestamp."

**L3 — Trigger logical-dedup guard:** `match_funding_to_users()` adds `NOT EXISTS (SELECT 1 FROM user_alerts ua_existing JOIN funding_rounds fr_existing ... WHERE normalize_company_name(fr_existing.company_name) = normalize_company_name(NEW.company_name) AND ua_existing.created_at > NOW() - INTERVAL '7 days')`. Belt-and-suspenders defense — even if a duplicate row slips through L1+L2, the trigger refuses to fire a duplicate user_alert.

**L4 — Trigger skips sec_edgar inserts:** `IF NEW.extraction_method = 'sec_edgar' THEN RETURN NEW;`. EDGAR is enrichment data, never real-time discovery. The runner can insert/verify rounds without ever creating user_alerts.

**L5 — Per-user dispatcher rate limit:** both `imessage_dispatcher.py` and `send-webhooks/index.ts` count recent sends per user (last 5 minutes), skip any user at >= 5 sends. Excess alerts wait for the next cron tick, throttled at most ~1/min instead of all at once.

### Verified in production
- Inserted "STIPPLE BIO LLC $75M" as a deliberate dup → trigger created **0 new alerts** (down from 18 before L3 fix)
- `find_existing_logical_round('Stipple Bio Inc')` correctly found the existing "Stipple Bio, Inc." row
- `merge_into_existing_round()` updated fields without changing row count or alert count (1→1, 3→3)

### Cleanup
- Archived 160 pending alerts from the incident window
- Deleted 6 confirmed dupe funding_rounds (Stipple Bio, Standing Ovation, Ambrosia Biosciences, Immutrin, Life Biosciences, PADO AI Orchestration) + 64 associated user_alerts
- 110 historical dupe groups (pre-incident) left in place — those user_alerts already shipped days/weeks ago, deleting them risks losing legitimate multi-round histories (e.g., OpenAI has 4 real funding rounds in DB)

### Universal lessons (apply going forward)

1. **Whenever adding a new RSS source or scraper, ASSUME the new source will produce duplicates of existing rounds.** Test the dedup path before letting it loose on the live cron + dispatcher. The right test is "insert a known duplicate row and verify zero new user_alerts fire."

2. **A trigger without a logical-dedup guard is a footgun.** Any code path that can `INSERT INTO funding_rounds` will fire user_alerts, even if the row is a duplicate. Defense-in-depth is mandatory: dedup at the writer level AND at the trigger level.

3. **Catch-up data sources need an explicit "don't alert" path.** EDGAR is 7-day-lagged, not real-time. So is Google News RSS for site:domain queries. So is any historical backfill. Always ask "is this real-time, or am I discovering historical data?" before deciding whether the trigger should fire alerts.

4. **Rate limit at the delivery layer as the final safety net.** Even if all upstream dedup fails, no user should ever receive >5 alerts in 5 minutes. This is a UX guarantee, not a nice-to-have.

5. **"Don't validate the design when the live cron is loaded with the bug" — kill the cron first.** When I rolled back the RSS feeds, I should have done so BEFORE the next cron tick, not after. Better: when introducing risky pipeline changes, deploy with the cron paused, verify on a synthetic test, then unpause.

6. **The original timestamp on a funding event is sacred.** Validation, enrichment, amount corrections, and SEC verification should all UPDATE the existing row in place. Never create a new row "just because the data is more accurate now" — that re-fires alerts and confuses users.

---

## 2026-04-09 (afternoon) — Ancient article incident (~85 stale iMessages)

### What happened
After shipping the L1-L5 fixes from the morning carpet-bomb incident, the PR wire + vertical RSS feeds (BusinessWire, GlobeNewswire, PR Newswire, Fierce Biotech, Defense News, Energy Storage News, BioSpace, SpaceNews) were re-enabled. Within 12 hours, ~20 brand-new ancient funding_rounds were inserted including BioAge Labs (2020), Form Energy (2021), AltruBio (2021), Greener Power Solutions (2022), ODAIA (2023), Resilience (2023), Hippocratic AI (2024), and several others. ~85 iMessages shipped to real users for funding rounds that closed 1-5 YEARS ago.

User noticed when they got an iMessage about AltruBio (which they remembered as old). Investigation showed AltruBio's article was from 2021-04-15.

### Root cause
**Google News RSS for `site:` searches returns articles from ANY time period — not real-time, not "recent."** A 5-year-old GlobeNewswire press release shows up with the same priority as today's release. Our pipeline had ZERO check on `published_date` before inserting/alerting.

The L1-L5 fixes from this morning prevented DUPLICATES (same round inserted twice) but did nothing to prevent FIRST-TIME ingestion of ancient articles. Different problem entirely.

L5 (per-user rate limit) didn't catch this either: only 1 stale alert per user per company → never trips the 5-alerts-per-5-min limit. L5 is flood protection, not quality control.

### Fixes shipped

**Freshness gate (`is_article_fresh()` in `run_fast.py`):** Reject any article whose RSS `published_parsed` timestamp is older than `FRESHNESS_GATE_DAYS = 14`. The check runs in `extract_one()` immediately after the URL dedup but BEFORE the Exa fetch, saving the entire pipeline cost on stale articles. Articles missing `published_parsed` fall through with `reason='no_pubdate'` (no regression for legitimate real-time feeds).

Verified against the live GlobeNewswire feed: 7/20 articles passed (legitimately recent), 13/20 rejected including 6.2-year-old DrChrono, 4-year-old SEON, 2.9-year-old ODAIA. Verified against all 7 currently-enabled real-time feeds (TC, Crunchbase News, Pulse2 VC, Axios, FinSMEs, Google Alerts): 0 false rejections, 0 missing pubdates.

**Extended dedup windows (L1+L2 from 14d → 90d, L3 trigger from 7d → 90d):** During the incident investigation, found that "Worth" (which we already had in DB from FinSMEs on 2026-03-25 — 15 days old) was inserted as a NEW row via GlobeNewswire today and shipped 3 iMessages. Both the SQL `normalize_company_name()` and Python `_normalize_company_for_match()` returned `'worth'` for both rows — but the dedup window was 14 days, so the original was juuust outside the window. Bumped both to 90 days. Catches late-arrival press for already-known rounds while still allowing legitimate Series A→B follow-on rounds (typically >6 months apart) to fire fresh alerts.

### Cleanup
- 49 pending alerts archived from the active dispatcher queue
- 155 user_alerts deleted across the 20 ancient rounds
- 20 funding_rounds rows deleted (BioAge Labs, AltruBio, Form Energy, Greener Power, ODAIA, Resilience, Hippocratic AI, Definition Health, North Texas Food Bank, Quino Energy, Rheinmetall, MGA Thermal, Unnatural Products, Worth, Zalos, Rocketlane, Qualified Health, Normal Computing, Storm, Tazapay)
- 20 pipeline_events references nullified (preserved audit trail without orphaning)

### Universal lessons (additional)

7. **Every external RSS feed needs a freshness gate.** Don't trust that a feed marketed as "real-time" only returns recent articles. Google News, Bing News, and any aggregator that uses search rather than chronological feed will return arbitrary-age content. Check `published_parsed` and reject anything older than your alerting window.

8. **A duplicate-prevention fix doesn't prevent a stale-content bug.** They're two different failure modes. The morning's L1-L5 fixes prevented "the same round shows up twice." The afternoon bug was "an old round shows up for the first time." Both need explicit defenses; neither implies the other.

9. **Verify the fix exercises the bug, not just the function logic.** I unit-tested the `is_article_fresh()` function with synthetic data, but the real validation was checking it against the LIVE problem feed and confirming it would have rejected the actual ancient articles I'd just deleted. The unit test alone wouldn't catch a wiring bug.

10. **The "I just fixed this yesterday" instinct is dangerous.** When the user said "altrubio got an alert," my first thought was "but I fixed dedup last night." The actual bug was unrelated to dedup. Always investigate the specific report on its own terms before mapping it onto recent fixes.

11. **Re-enabling rolled-back features is a separate change with its own risk.** When I rolled back the PR wire feeds in the morning AND fixed the L1-L5 dedup bugs, I re-enabled the feeds at the end of the same session. That re-enable was an independent change with a different bug class (ancient articles) that the dedup fixes didn't address. Re-enables should get their own pre-flight checks.

---

## 2026-04-09 (evening) — Recap article incident (ElectronX, ~3 stale alerts)

### What happened
Vaughn noticed an iMessage about ElectronX raising "$55M Series A" and asked why it triggered. Investigation showed: VC Tavern published a launch-announcement recap article TODAY (article freshness gate correctly let it through) describing three SEPARATE rounds: $15M seed (June 2024), $10M strategic (Feb 2025), $30M Series A (Nov 2025). Cumulative $55M. Claude (Haiku 4.5) misread the recap as a single fresh $55M Series A event, merged all 13 investors across all 3 rounds, and returned 95% confidence. The pipeline inserted, the trigger fired, 21 user_alerts were created and 3 iMessages shipped before Vaughn caught it.

### Root cause
**The freshness gate operates on article publication date, not on funding event date.** A recap article published today about a 5-month-old round looks fresh to every layer of defense. The Claude prompt at `claude_extraction.py:525` only said "If the article mentions multiple funding rounds, extract ONLY the primary/most prominent one" — which Claude interpreted as "pick the biggest", not "pick the most recent and don't aggregate."

This is a third distinct bug class:
- Morning: duplicate inserts of recently-discovered rounds (L1-L5 fixes)
- Afternoon: ancient articles being treated as new (RSS pubDate freshness gate)
- Evening: fresh articles describing old events (event-level freshness gate)

### Fixes shipped

**Layer 1 (LLM) — `claude_extraction.py`:**
- Added `event_date` to the JSON schema: the date the funding round actually CLOSED, in YYYY-MM-DD format. Claude is told this is distinct from article publication date and to look for phrases like "closed in November 2025", "raised in Q3 2024", "announced today".
- Added `is_recap_article` boolean: Claude flags articles whose body describes 2+ rounds dated 30+ days apart, mentions cumulative totals, or exists primarily to announce a product launch with funding as background.
- Rewrote the multi-round rule: "extract ONLY the MOST RECENT round (by close date, not by amount). DO NOT aggregate amounts or merge investors across rounds."
- Updated `validate_response` to pass through `event_date` (validated as YYYY-MM-DD) and `is_recap_article` (parsed as bool, default False). Both are advisory — the rule layer decides what to do.

**Layer 2 (rule) — `run_fast.py`:**
- Added `EVENT_FRESHNESS_DAYS = 14` constant alongside the existing `FRESHNESS_GATE_DAYS`
- Added `is_event_fresh(extraction)` helper that rejects on `is_recap_article == True` OR `event_date > 14 days old`. Allows through with `reason='no_event_date'` if Claude couldn't pin a date — defensive default to avoid regressing legit single-round articles.
- Wired into `extract_one()` after Claude extraction succeeds but BEFORE L1+L2 dedup, with `[RECAP]` and `[STALE EVENT]` log lines

### Verified end-to-end
1. **13 unit-test cases pass** for `is_event_fresh()`: recap=True alone, recap=True with fresh date, fresh today, 5d/14d boundary, 15d/150d/700d rejected, null event_date, empty dict, unparseable date, normal fresh announcement.
2. **Live test against the actual ElectronX article** with the new prompt: Claude now returns `is_recap_article=true`, `event_date=2025-11-15`, `amount_usd=$30M` (just the Series A, NOT the cumulative $55M), and 10 investors (just the Series A round, not the merged 13). Pipeline outcome: `SKIP via [RECAP]`. Even better than expected — Layer 1 alone fixed the data quality issue, AND Layer 2 catches it as a backstop.
3. **Two production cron ticks observed (18:03, 18:04)**: existing RSS gate caught Voltstorage (5.7 years old), new event gate didn't false-fire on any real-time article, no regressions to existing feeds.

### Cleanup
- 17 still-pending ElectronX user_alerts archived
- 21 total user_alerts deleted, 1 funding_rounds row deleted, 1 pipeline_events ref nullified
- Final verification: `SELECT COUNT(*) FROM funding_rounds WHERE company_name = 'ElectronX'` returns 0

### Universal lessons (additional)

12. **The article date and the event date are different things.** An article can be published today about an event that happened years ago. Any system that triggers alerts off article publication is one recap article away from this bug. Always extract the EVENT date and gate on that, not just the article date.

13. **"Pick the primary one" is ambiguous to LLMs.** When asked to extract "the primary funding round" from a multi-round article, Claude reasonably interpreted "primary" as "biggest" or "most prominent in the headline." The fix was to be unambiguous: "the MOST RECENT round, by close date, not by amount, and do not aggregate." LLMs do exactly what you say — be precise.

14. **Defense in depth means LLM AND rules.** The Layer 1 prompt change alone fixed the ElectronX data quality issue (Claude now returns the correct $30M Series A). The Layer 2 rule also catches it via `is_recap_article=true`. Either layer alone would have stopped the bug, but having both means the LLM's judgment can be wrong and the rule still saves us — and vice versa.

15. **High Claude confidence is not high signal quality.** ElectronX returned `confidence: 95` for a completely wrong extraction. Confidence is calibrated to "how clear is the article" not "how correct am I." Don't trust confidence as a quality gate; use it as a tie-breaker between rules.

16. **A defense that hasn't been exercised in production isn't a defense yet.** I shipped the RSS pubDate freshness gate this afternoon and had unit tests + live integration tests. But the FIRST production failure was a class of bug that bypassed it entirely. Each gate covers a specific failure mode — the next bug will be a failure mode you haven't gated yet. Build defenses as you discover failures, but assume there are more failure modes you haven't seen.
