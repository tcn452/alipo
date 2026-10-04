'use client';

import { useEffect, useState } from 'react';
import { isStandalonePwa } from '@/lib/geolocation';
import { enableFuelAlerts, savedStationIds, syncFuelAlerts } from '@/lib/fuel-alerts';
import { trackEvent } from '@/lib/gtag';
import { useLanguage } from '@/lib/i18n';

export function FuelAlerts() {
  const { t } = useLanguage();
  const [eligible, setEligible] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [publicKey, setPublicKey] = useState('');
  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      const supported = isStandalonePwa() && 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
      if (!mounted) return;
      setEligible(supported && savedStationIds().length > 0);
      if (!supported) return;
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (!mounted) return;
      setEnabled(Boolean(subscription));
      const config = await fetch('/api/push/subscriptions', { cache: 'no-store' });
      if (config.ok) {
        const payload = await config.json() as { publicKey: string };
        if (mounted) setPublicKey(payload.publicKey);
      } else if (mounted) setMessage(t('Fuel alerts are not available yet. Please try again later.'));
      if (subscription) {
        try { await syncFuelAlerts(subscription); }
        catch { if (mounted) setMessage(t('Unable to sync your saved stations. Please try again.')); }
      }
    };
    const update = () => { void refresh().catch(() => { if (mounted) setMessage(t('Fuel alerts could not be loaded.')); }); };
    update();
    window.addEventListener('alipo-watch-changed', update);
    window.addEventListener('storage', update);
    return () => { mounted = false; window.removeEventListener('alipo-watch-changed', update); window.removeEventListener('storage', update); };
  }, [t]);
  const toggle = async () => {
    setBusy(true); setMessage('');
    try {
      if (enabled) {
        const response = await fetch('/api/push/subscriptions', { method: 'DELETE' });
        if (!response.ok) throw new Error('Unable to disable fuel alerts. Please try again.');
        const registration = await navigator.serviceWorker.ready;
        await (await registration.pushManager.getSubscription())?.unsubscribe();
        setEnabled(false);
        trackEvent('fuel_alert_disabled');
      } else {
        await enableFuelAlerts(publicKey); setEnabled(true);
        trackEvent('fuel_alert_enabled', { station_count: savedStationIds().length });
      }
    } catch (error) { setMessage(error instanceof Error ? error.message : t('Unable to enable fuel alerts.')); }
    finally { setBusy(false); }
  };
  if (!eligible && !enabled) return null;
  return <section aria-label={t('Fuel alerts')} className="mx-auto max-w-[1440px] border-t border-line px-5 py-5 sm:px-8 lg:px-12">
    <h2 className="text-sm font-bold text-forest">{t('Fuel alerts for saved stations')}</h2>
    <p className="mt-1 text-xs text-muted">{t('Get a notification when petrol or diesel becomes available, even when Alipo is closed.')}</p>
    <button type="button" disabled={busy || (!enabled && !publicKey)} aria-pressed={enabled} onClick={() => { void toggle(); }} className="mt-3 min-h-11 border border-forest px-4 text-sm font-bold text-forest disabled:opacity-50">{t(busy ? 'Saving…' : enabled ? 'Turn off fuel alerts' : 'Enable fuel alerts')}</button>
    {message ? <p role="status" className="mt-2 text-xs">{t(message)}</p> : null}
  </section>;
}
