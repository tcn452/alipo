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

/**
 * Log a generic Google Analytics custom event
 */
export function trackEvent(eventName: string, params?: GtagEventParams) {
  if (typeof window === 'undefined') return;
  window.dataLayer ||= [];
  window.gtag ||= function () { window.dataLayer!.push(arguments); };
  window.gtag('event', eventName, params);
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
export function trackAreaShare(method: 'native' | 'whatsapp', areaId: string, fuel: 'petrol' | 'diesel') {
  trackEvent('share', { method, content_type: 'area_status', item_id: `${areaId}:${fuel}`, area_id: areaId, fuel_type: fuel });
}
