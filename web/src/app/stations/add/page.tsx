'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, LocateFixed, MapPin } from 'lucide-react';
import { Header } from '@/components/Header';
import { useLanguage } from '@/lib/i18n';

type CapturedLocation = { latitude: number; longitude: number; accuracy: number };

export default function AddStationPage() {
  const { t } = useLanguage();
  const [location, setLocation] = useState<CapturedLocation | null>(null);
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const captureLocation = () => {
    setError(''); setLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => { setLocation({ latitude: coords.latitude, longitude: coords.longitude, accuracy: coords.accuracy }); setLocating(false); },
      () => { setError(t('Allow location access and try again while standing at the station.')); setLocating(false); },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    captureLocation();
  }, []);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!location) return setError(t('Capture your live location while at the station.'));
    setSubmitting(true); setError('');
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch('/api/stations/community', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, ...location }) });
    const result = await response.json() as { error?: string };
    setSubmitting(false);
    if (!response.ok) return setError(t(result.error || 'Unable to add this station.'));
    setDone(true);
  };

  return <><Header /><main className="mx-auto w-full max-w-2xl space-y-5 p-4 py-8 sm:p-8">
    <div><span className="inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800"><MapPin className="h-3.5 w-3.5" /> {t('Community map')}</span><h1 className="mt-3 text-3xl font-black text-gray-950">{t('Add a filling station')}</h1><p className="mt-2 text-sm leading-6 text-gray-600">{t('Only submit while you are physically at the filling station. Alipo will use your live phone location as the station pin, so do not submit from home or from another place.')}</p></div>
    {done ? <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center"><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-700" /><h2 className="mt-3 text-xl font-black">{t('Station added')}</h2><p className="mt-2 text-sm text-gray-600">{t('Thank you for helping improve Malawi’s community fuel map.')}</p><Link href="/" className="mt-5 inline-flex h-11 items-center bg-emerald-800 px-5 text-sm font-black text-white">{t('Return to map')}</Link></section> : <form onSubmit={submit} className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <label className="block text-sm font-bold">{t('Station name')}<input required name="name" maxLength={200} className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-3 outline-none focus:border-emerald-700" placeholder={t('e.g. Puma Area 18')} /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold">{t('Brand')}<input name="brand" className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-3" placeholder="Puma, TotalEnergies…" /></label><label className="block text-sm font-bold">{t('Town or city')}<input name="city" className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-3" placeholder="Lilongwe" /></label></div>
      <label className="block text-sm font-bold">{t('Your phone number')}<input required name="phone" inputMode="tel" autoComplete="tel" className="mt-2 h-12 w-full rounded-xl border border-gray-300 px-3" placeholder="+265…" /><span className="mt-1 block text-xs font-normal text-gray-500">{t('Converted to a private fingerprint before storage.')}</span></label>
      <button type="button" onClick={captureLocation} disabled={locating} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-700 px-4 text-sm font-black text-emerald-800 disabled:opacity-50"><LocateFixed className="h-5 w-5" /> {t(locating ? 'Finding your exact location…' : location ? 'Recapture location' : 'Use my location at this station')}</button>
      {location ? <p className="rounded-xl bg-emerald-50 px-4 py-3 text-xs font-bold text-emerald-800">{t('Location captured · accuracy about {metres} metres', { metres: Math.round(location.accuracy) })}</p> : null}
      {error ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</p> : null}
      <button disabled={!location || submitting} className="h-12 w-full rounded-xl bg-gray-950 text-sm font-black text-white disabled:opacity-40">{t(submitting ? 'Adding station…' : 'Add this station')}</button>
    </form>}
  </main></>;
}
