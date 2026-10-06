# Alipo Vercel custom events

The existing analytics helper now sends the product events below to both Vercel Web Analytics and GA4. Google-specific promotion/install aliases remain GA-only so each action contributes one canonical Vercel event. Page views remain handled automatically by the existing Analytics component.

## Where to view

Open [Alipo Web Analytics](https://vercel.com/infowewebcozas-projects/alipo/analytics), choose a production date range and open Custom Events. Select an event to inspect its properties. Custom events require Pro or Enterprise on the team that owns the project.

| Goal | Events | Useful properties |
| --- | --- | --- |
| Ad exposure and clicks | `sponsor_impression`, `sponsor_click` | `sponsor_id`, `sponsor_name`, `placement`, `city` |
| Advertising enquiries | `advertising_rate_card_opened`, `advertising_enquiry` | `placement`, `method` |
| Fuel reporting funnel | `fuel_update_started`, `fuel_update_completed`, `fuel_update_failed` | `station_id`, `fuel_type`, `fuel_status`, `queue_estimate`, `method`, `response_status` |
| Sharing | `share` | `method`, `content_type`, `area_id`, `fuel_type` |
| Area-report views | `area_report_viewed` | `area_id`, `fuel_type` |
| Navigation intent | `station_directions_opened`, `station_map_opened` | `station_id`, `city` |
| Saved stations | `station_saved`, `station_unsaved` | `station_id` |
| Alert adoption | `fuel_alert_enabled`, `fuel_alert_disabled` | `station_count` |
| Installation | `pwa_install` | `platform`, `trigger` |
| Release notes | `release_notes_viewed`, `release_notes_dismissed` | `app_version`, `trigger`, `reason` |
| Legacy launch notifications | `launch_alert_permission` | `status` |

Speed Insights is already integrated separately for page performance.

## Advertiser reports

For the same advertiser, placement, production environment and date range, divide `sponsor_click` by `sponsor_impression` and multiply by 100 for click-through rate. Report the two underlying counts alongside the rate. Do not sum the GA promotion aliases into these counts.

An impression is recorded when at least half of the ad container is visible in an active browser tab, once per sponsor per slot for that mounted page. It is not a unique-person count or a certified viewability measurement. Repeat clicks can be recorded. Ad blockers and network failures can reduce analytics totals. Zero impressions means CTR is unavailable, not zero.

Fuel reporting starts can be triggered by opening a form or initiating quick confirmation; completed means the API accepted the report. Share events mean a share destination opened or a link was copied, not confirmation that a message was sent. An advertising enquiry means the contact link was clicked, not a confirmed lead received.

## Data and rollout

Vercel properties use an explicit per-event allowlist. Phone numbers, coordinates, search text, error messages, destination URLs and arbitrary new properties are not sent through this bridge. Analytics failures are isolated from the product action and the other analytics provider.

Events begin collecting after the code is deployed; this change does not backfill earlier activity. Verify an actual production action appears in Custom Events after deployment before presenting event totals to advertisers.

[Official custom-event documentation](https://vercel.com/docs/analytics/custom-events)
