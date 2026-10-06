import { track as trackVercel } from '@vercel/analytics';

export const GA_TRACKING_ID = 'G-9NR2XVH5WC';

type GtagEventParams = Record<string, string | number | boolean | null | undefined>;

export function trackFuelUpdate(stage: 'started' | 'completed' | 'failed', details: {
  station_id?: string; fuel_type?: string; fuel_status?: string; queue_estimate?: string; city?: string; response_status?: number; method?: 'form' | 'one_tap';
} = {}) {
  // Explicit allowlist: never forward phone, coordinates, or API error text.
  trackEvent(`fuel_update_${stage}`, {
    station_id: details.station_id,
    fuel_type: details.fuel_type,
    fuel_status: details.fuel_status,
    queue_estimate: details.queue_estimate,
    city: details.city,
    response_status: details.response_status,
    method: details.method || 'form',
  });
}

declare global {
  interface Window {
    gtag?: (command: string, ...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

// Keep Vercel's events focused on product actions. GA promotion/install aliases
// remain in GA only so one action does not become two Vercel events.
const VERCEL_EVENT_PROPERTIES: Record<string, readonly string[]> = {
  fuel_update_started: ['station_id', 'city', 'fuel_type', 'fuel_status', 'queue_estimate', 'response_status', 'method'],
  fuel_update_completed: ['station_id', 'city', 'fuel_type', 'fuel_status', 'queue_estimate', 'response_status', 'method'],
  fuel_update_failed: ['station_id', 'city', 'fuel_type', 'fuel_status', 'response_status', 'method'],
  sponsor_impression: ['sponsor_id', 'sponsor_name', 'placement', 'city'],
  sponsor_click: ['sponsor_id', 'sponsor_name', 'placement', 'city'],
  advertising_rate_card_opened: ['placement'],
  advertising_enquiry: ['method'],
  share: ['method', 'content_type', 'area_id', 'fuel_type'],
  area_report_viewed: ['area_id', 'fuel_type'],
  station_saved: ['station_id'],
  station_unsaved: ['station_id'],
  station_directions_opened: ['station_id', 'city'],
  station_map_opened: ['station_id', 'city'],
  fuel_alert_enabled: ['station_count'],
  fuel_alert_disabled: [],
  pwa_install: ['platform', 'trigger'],
  launch_alert_permission: ['status'],
  release_notes_viewed: ['app_version', 'trigger'],
  release_notes_dismissed: ['app_version', 'reason'],
};

/** Track product actions in GA4 and Vercel without blocking the user's action. */
export function trackEvent(eventName: string, params?: GtagEventParams) {
  if (typeof window === 'undefined') return;
  const keys = VERCEL_EVENT_PROPERTIES[eventName];
  if (keys) {
    const properties: GtagEventParams = {};
    for (const key of keys) {
      const value = params?.[key];
      if (typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) properties[key] = value;
    }
    try { trackVercel(eventName, properties); } catch { /* Analytics must not block reporting or navigation. */ }
  }
  try {
    window.dataLayer ||= [];
    window.gtag ||= function () { window.dataLayer!.push(arguments); };
    window.gtag('event', eventName, params);
  } catch { /* Analytics must not block reporting or navigation. */ }
}

/**
 * Log PWA installation event to Google Analytics
 */
export function trackPwaInstall(
  platform: string,
  trigger: 'prompt' | 'appinstalled' | 'standalone_open' = 'prompt'
) {
  trackEvent('pwa_install', {
    event_category: 'PWA',
    event_label: platform,
    platform,
    trigger,
  });

  // Also log standard GA4 conversion-friendly event
  trackEvent('app_install', {
    platform,
    method: trigger,
  });
}

/**
 * Log notification opt-in for October 1 launch alert
 */
export function trackLaunchAlertPermission(status: 'granted' | 'denied' | 'default') {
  trackEvent('launch_alert_permission', {
    event_category: 'Notifications',
    event_label: status,
    status,
  });
}

/**
 * Log pre-launch viral sharing
 */
export function trackShare(method: string = 'whatsapp', shareUrl?: string) {
  trackEvent('share', {
    method,
    content_type: 'launch_countdown',
    item_id: shareUrl || 'alipo.co.mw',
  });
}

/**
 * Log sponsor banner impression for CTR tracking
 */
export function trackSponsorImpression(
  sponsor: { id: string; name: string; city?: string },
  placement: string = 'banner'
) {
  trackEvent('sponsor_impression', {
    event_category: 'Sponsorship',
    sponsor_id: sponsor.id,
    sponsor_name: sponsor.name,
    placement,
    city: sponsor.city || 'all',
  });

  // Standard GA4 view_promotion event for built-in promotion CTR reporting
  trackEvent('view_promotion', {
    promotion_id: sponsor.id,
    promotion_name: sponsor.name,
    creative_name: placement,
    creative_slot: placement,
    location_id: sponsor.city || 'all',
  });
}

/**
 * Log sponsor banner click for CTR tracking
 */
export function trackSponsorClick(
  sponsor: { id: string; name: string; cta_url: string; city?: string },
  placement: string = 'banner'
) {
  trackEvent('sponsor_click', {
    event_category: 'Sponsorship',
    sponsor_id: sponsor.id,
    sponsor_name: sponsor.name,
    placement,
    city: sponsor.city || 'all',
    destination_url: sponsor.cta_url,
  });

  // Standard GA4 select_promotion event for built-in promotion CTR reporting
  trackEvent('select_promotion', {
    promotion_id: sponsor.id,
    promotion_name: sponsor.name,
    creative_name: placement,
    creative_slot: placement,
    location_id: sponsor.city || 'all',
  });
}

/** A share action; WhatsApp cannot confirm that a message was actually sent. */
export function trackAreaShare(method: 'native' | 'whatsapp' | 'facebook' | 'copy_link', areaId: string, fuel: 'petrol' | 'diesel') {
  trackEvent('share', { method, content_type: 'area_status', item_id: `${areaId}:${fuel}`, area_id: areaId, fuel_type: fuel });
}
