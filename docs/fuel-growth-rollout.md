# Fuel reporting, sharing and alerts rollout

## Live rollout — 4 October 2026

PR #14 was merged into `main` and v1.1 deployed to https://alipo.co.mw (currently redirected by Vercel to the www host). The live Supabase project `xsnkzaweqeeocsdduhoi` has the subscription and scheduler migrations applied. Production Vercel variables contain the generated VAPID pair, `VAPID_SUBJECT=mailto:info@wekode.dev`, a random dispatcher bearer token, and the public `NEXT_PUBLIC_SITE_URL=https://alipo.co.mw`. Private keys and tokens are not committed.

Supabase Cron runs `alipo-fuel-alert-dispatch` every minute using `pg_net`; Vercel Cron is not used. The bearer token is encrypted in Supabase Vault as `alipo_fuel_alert_cron_secret` and cannot be read by browser roles. The scheduler skips HTTP calls when no subscription with saved stations is eligible. The canonical `www` host is required: the apex redirects across hosts, which strips Authorization. `pg_net` extension metadata is installed in `extensions`, with its HTTP API in `net`.

Verified against production: subscription configuration returns 200, the Vault-authenticated dispatcher returns 200 with `checked:0/sent:0/failed:0`, unauthenticated dispatch is denied, invalid subscription payloads are rejected, and scheduled database runs succeed. RLS is enabled and `anon`/`authenticated` have no subscription table privileges; `service_role` has the required access. Browser checks confirm the v1.1 footer, returning-user release dialog, one-tap controls, live station data, and absence of the resolved apology banner. The live status API returns current fuel reports; rollout did not delete report data. A live OG preview failure exposed a multiple-child text layout unsupported by Satori; a PNG-rendering regression test now covers it.

Still requiring manual verification: installed Android and iOS device opt-in, notification delivery with the app closed, and WhatsApp's own crawler/share-sheet behavior. Area subscriptions remain deferred. GA4 property key-event registration and monitoring alerts remain manual as requested. A pre-existing advisor warning concerns browser execution privileges on `public.rls_auto_enable()`; it is unrelated to push storage ([advisor details](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)). The subscription table's “RLS enabled, no policies” notice is intentional: only the server can access it.

## What is implemented

- Web version 1.1.0 (displayed as Alipo v1.1). Returning users with completed onboarding see the “What’s new” dialog once per browser/device after dismissing it. New users receive onboarding instead, and the release is marked seen for them. The footer can reopen release notes at any time. The dialog waits for other dialogs to close, supports Escape and keyboard focus trapping, and includes English/Chichewa copy. Clearing browser storage resets this history.

- `fuel_update_started`, `fuel_update_completed`, and `fuel_update_failed`, with `method=form|one_tap`. Completion is emitted only after the report API returns success. Phone numbers, coordinates and error text are excluded. Started is counted once per form opening; a one-tap attempt counts as a start.
- Each sponsor/placement/slot is counted once during that mounted slot's lifetime, after at least 50% intersects the viewport while the document is visible. Scrolling away/back, React effect replay and rotating back to the same sponsor do not add impressions. A new page load or recreated slot can count again. `view_promotion` remains the GA4 companion event; do not sum both events as impressions.
- Browser `edge_cache_response` events are removed. Sponsor, catalogue and status handlers emit structured origin response logs. Actual CDN HIT/MISS information must come from hosting access logs; origin code cannot see a response served entirely by the CDN.
- Station cards submit petrol/diesel availability directly with no invented queue value. These are fresh anonymous reports using the existing report endpoint, not phone-verified distinct-person confirmations.
- A picture card shows each fuel's status and report time in CAT, and labels reports stale after four hours. Native file sharing opens the device share sheet; choose WhatsApp there. Browsers without file sharing offer a WhatsApp text link plus a downloadable PNG to attach manually. All station links include `utm_source=whatsapp&utm_medium=share&utm_campaign=station_status`; shared pages render fresh server metadata/OG cards. Native share events use `method=native` because the app cannot inspect the chosen destination.
- Saved-station web push is offered only to installed PWAs with at least one saved station. Saving alone never asks permission. Onboarding no longer offers notifications. Users explicitly enable/disable alerts; station saves/removals sync the active subscription. No area-based alerts in this first release.

## GA4 setup (requires property Editor access; not applied by this change)

The measurement ID in this repository is `G-9NR2XVH5WC`. A measurement ID is not a GA property ID or authorization credential. No Google Analytics management connection was available in the build session.

`scripts/ga4-key-events.json` is the canonical list of three key events. An idempotent Admin API setup script previews, creates missing registrations, corrects their counting method, and re-reads the property to verify the result. It leaves all other existing key events alone. Google Analytics Admin API must be enabled for the OAuth client's Google Cloud project. Supply `GA4_PROPERTY_ID` (numeric ID) and `GA4_ACCESS_TOKEN` securely in the operator's environment; the token needs `analytics.edit` scope and Editor access to this property. Never commit or paste tokens into shell commands or conversation.

```sh
# Read-only preview; no registration changes.
node scripts/configure-ga4-key-events.mjs
# Register the three events and verify the result.
node scripts/configure-ga4-key-events.mjs --apply
```

Successful apply prints `applied_and_verified`. The script was tested against a mock Admin API, not run against the live property, because the property ID and authorized token are unavailable. This script registers key events only; GA monitoring alerts still require the setup below.

The v1.1 popup emits `release_notes_viewed` (automatic/manual) and `release_notes_dismissed` (close button/continue/Escape), both tagged with `app_version=1.1`. Register `app_version`, `trigger` and `reason` as event-scoped dimensions if needed. These are diagnostic events, not key events; popup exposure must not inflate the reporting/install/alert conversion KPIs.

1. In Admin → Data display → Key events, create/mark `fuel_update_completed`, `app_install`, and `fuel_alert_enabled`. Use **once per event** for completed reports and alerts; installation is already deduplicated on the device. Do not mark `fuel_update_started` or sponsor impressions as key events. `pwa_install` is the companion install diagnostic; use only `app_install` for the install KPI.
2. Register event-scoped custom dimensions `method`, `fuel_type`, `fuel_status`, `placement` and `sponsor_id` as needed. Existing `method` dimensions may already be registered. Avoid registering high-cardinality station IDs unless a report needs them.
3. In Reports → Insights → View all insights → Create custom, enable email notifications for monitoring. Recommended initial rules: daily `fuel_update_completed` key events fall >50% against the previous week; daily `app_install` key events fall >50%; failures rise above the established daily baseline. If the builder cannot filter the failure event metric, use a daily GA Data API monitor. Select the team's existing recipients in GA; this change sends no email.
4. Build an Exploration filtered to fuel events: completions/starts overall and by `method`; shares and new users by session source/medium `whatsapp/share`; clean impressions and sponsor clicks by sponsor/placement; alert opt-ins. The quoted 21%, 47%, and 61% are user-provided hypotheses, not independently verified measurements. This release establishes future measurements; historical inflated counts cannot be repaired.
5. Verify in DebugView: successful form and quick report → one completed event; rejected report → failed only; scroll sponsor away/back → no duplicate; installation event → one `app_install`. Compare post-release sponsor counts to server access/traffic data before reporting CTR.

## Push configuration and operations

The database migration is `supabase/migrations/20261004171002_fuel_push_subscriptions.sql`. It is applied to the live Alipo database. It enables RLS, revokes public/browser-role access, and grants only `service_role` access. Scheduler migrations are `20261004174839_fuel_alert_scheduler.sql` and `20261004175048_fuel_alert_scheduler_origin.sql`, both applied. Push endpoints/keys are capability secrets; never put them in logs or analytics.

1. For another environment, apply the subscription and scheduler migrations through the reviewed Supabase workflow. Supabase requires `pg_cron`, `pg_net`, and Vault for this scheduler.
2. Production keys already exist: preserve the VAPID pair. Regenerating it requires existing devices to resubscribe. For a new environment, generate a pair using `cd web && npx web-push generate-vapid-keys`, and configure the public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, private key as `VAPID_PRIVATE_KEY`, and operational contact as `VAPID_SUBJECT`. Keep the existing Supabase secret key server-side. Use `https://alipo.co.mw` for `NEXT_PUBLIC_SITE_URL`; the dispatcher uses the non-redirecting internal host.
3. The same random `FUEL_ALERT_CRON_SECRET` must exist in Vercel production and Vault's `alipo_fuel_alert_cron_secret`. Update both together when rotating, then redeploy Vercel. Compose includes the variables for other hosting environments. Missing configuration returns 503 and disables opt-in before permission is requested.
4. The live Supabase scheduler makes an authenticated GET to `https://www.alipo.co.mw/api/push/dispatch` every minute. Do not put the secret in a URL. Check Supabase Cron job runs and `net._http_response` for HTTP failures; SQL scheduling success alone does not confirm successful HTTP delivery. Responses are retained by pg_net for approximately six hours. To pause dispatch: `select cron.unschedule('alipo-fuel-alert-dispatch');`. Reapply the canonical-host schedule to resume. The idle check saves Vercel invocations; active subscriptions still consume hosting/database quotas.
5. Install Alipo on a test device, save a station, enable alerts. Confirm the server subscription exists. With Alipo closed, report that fuel changing from out/unknown/low to available; confirm delivery and opening the station page. Test iOS home-screen and Android; web push requires platform support and HTTPS. Remove the saved station and confirm no further notifications, then turn alerts off and confirm deletion.

Dispatch uses current station readings, not a durable database event queue. It processes the 100 least-recently-checked subscriptions per invocation with bounded concurrency and a two-minute lease. It alerts on transitions to **fresh available** petrol/diesel and combines changes into one notification per subscription. Repeated confirmations of already-available fuel do not alert. Newly added stations are baselined without sending a historical notification. Short-lived transitions between polling runs can be missed. Raise scheduler capacity or introduce a durable outbox if subscription volume exceeds 100/minute. Delivery is best effort: provider acceptance does not guarantee display, and a crash between send and state commit can cause a retry notification. 404/410 endpoints are deleted; other failures retain the baseline for retry.

## Verification performed

- Production build and TypeScript checks.
- Full repository web test suite, including completion payload/privacy and fresh/stale share-card regressions.
- Local Postgres-compatible migration execution: RLS, browser role denial, service-role insert, and overlapping dispatch lease exclusion.
- Browser fixture checks: direct report completion, failure without completion, rapid-double-click suppression, PNG generation, and saving without a notification prompt in an uninstalled browser.

The live app, database privileges, scheduler, dispatcher authentication and read APIs were verified after rollout. Real device push delivery, WhatsApp crawler fetching, GA key-event settings and GA alert emails remain manual checks. External map assets did not load in the earlier local preview; the production browser loaded the station list and map. Test report submissions used mocked data; no artificial fuel reports were submitted to production.
