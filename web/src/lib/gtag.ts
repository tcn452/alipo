export const GA_TRACKING_ID = 'G-9NR2XVH5WC';

type GtagEventParams = Record<string, string | number | boolean | null | undefined>;

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
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('event', eventName, params);
  }
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
