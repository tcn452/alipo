'use client';
import { useState } from 'react';
import { requestCurrentPosition } from '@/lib/geolocation';
import { useLanguage } from '@/lib/i18n';

export function LocationVote({ stationId, onConfirmed }: { stationId: string; onConfirmed?: () => void }) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const vote = () => {
    if (phone.replace(/\D/g,'').length < 7) { setMessage(t('Enter a valid phone number.')); return; }
    setBusy(true);
    requestCurrentPosition(async ({ coords }) => {
      try {
        const response = await fetch(`/api/stations/${encodeURIComponent(stationId)}/location-confirm`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ phone, latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }) });
        const result = await response.json() as { error?: string; votes?: number; confirmed?: boolean };
        if (!response.ok) throw new Error(result.error || 'Unable to confirm location.');
        setMessage(t(result.confirmed ? 'Location confirmed. Thank you.' : 'Location vote saved. A second visitor must confirm it.'));
        onConfirmed?.();
      } catch(error) { setMessage(t(error instanceof Error ? error.message : 'Unable to confirm location.')); }
      finally { setBusy(false); }
    }, () => { setBusy(false); setMessage(t('Enable location while at the station to confirm its pin.')); });
  };
  return <div onClick={(event) => event.stopPropagation()} className="mt-3 space-y-2 rounded-lg border border-amber-200 bg-amber-50 p-3"><p className="text-xs font-bold text-amber-900">{t('Unconfirmed location')}</p><p className="text-xs text-amber-900">{t('At this station? Two other visitors can confirm its map pin.')}</p><label className="block text-xs">{t('Your phone number')}<input value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" autoComplete="tel" maxLength={20} className="mt-1 w-full rounded border bg-white p-2" /></label><button type="button" disabled={busy} onClick={vote} className="min-h-10 rounded bg-forest px-3 text-xs font-bold text-white disabled:opacity-50">{t(busy ? 'Confirming…' : 'Confirm this location')}</button>{message ? <p role="status" className="text-xs">{message}</p> : null}</div>;
}
