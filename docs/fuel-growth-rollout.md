# Fuel reporting, sharing and alerts rollout

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

## Push rollout (migration and secrets required)

The database migration is `supabase/migrations/20261004171002_fuel_push_subscriptions.sql`. It has been checked locally, not applied to the live Alipo database. It enables RLS, revokes public/browser-role access, and grants only `service_role` access. Push endpoints/keys are capability secrets; never put them in logs or analytics.

1. Apply the migration through the normal reviewed Supabase migration workflow to project `xsnkzaweqeeocsdduhoi`.
2. Generate VAPID keys using `cd web && npx web-push generate-vapid-keys`. Store the public key as `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, the private key as `VAPID_PRIVATE_KEY`, and a real operational contact as `VAPID_SUBJECT` (`mailto:` or HTTPS URL). Set a random `FUEL_ALERT_CRON_SECRET` (at least 32 bytes). Keep the existing Supabase secret key server-side. Set `NEXT_PUBLIC_SITE_URL` to the deployed HTTPS origin.
3. Deploy the app. Compose includes these runtime variables; Vercel or Dokploy must supply them through environment settings. A missing config returns 503 and disables the opt-in button before permission is requested.
4. Schedule an authenticated GET to `/api/push/dispatch` every minute with `Authorization: Bearer <FUEL_ALERT_CRON_SECRET>`. Use Dokploy's scheduler or another existing scheduler; do not include the secret in a URL. No scheduler has been installed by this change.
5. Install Alipo on a test device, save a station, enable alerts. Confirm the server subscription exists. With Alipo closed, report that fuel changing from out/unknown/low to available; confirm delivery and opening the station page. Test iOS home-screen and Android; web push requires platform support and HTTPS. Remove the saved station and confirm no further notifications, then turn alerts off and confirm deletion.

Dispatch uses current station readings, not a durable database event queue. It processes the 100 least-recently-checked subscriptions per invocation with bounded concurrency and a two-minute lease. It alerts on transitions to **fresh available** petrol/diesel and combines changes into one notification per subscription. Repeated confirmations of already-available fuel do not alert. Newly added stations are baselined without sending a historical notification. Short-lived transitions between polling runs can be missed. Raise scheduler capacity or introduce a durable outbox if subscription volume exceeds 100/minute. Delivery is best effort: provider acceptance does not guarantee display, and a crash between send and state commit can cause a retry notification. 404/410 endpoints are deleted; other failures retain the baseline for retry.

## Verification performed

- Production build and TypeScript checks.
- Full repository web test suite, including completion payload/privacy and fresh/stale share-card regressions.
- Local Postgres-compatible migration execution: RLS, browser role denial, service-role insert, and overlapping dispatch lease exclusion.
- Browser fixture checks: direct report completion, failure without completion, rapid-double-click suppression, PNG generation, and saving without a notification prompt in an uninstalled browser.

Live report persistence, real device push delivery, WhatsApp crawler fetching, GA key-event settings and GA alert emails require the deployment/configuration steps above. External map assets did not load in the local preview; new station interactions were verified with mocked data and responses.
