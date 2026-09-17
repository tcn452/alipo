'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Check, ExternalLink, LocateFixed, MapPin, Plus, RefreshCw, ShieldCheck, X } from 'lucide-react';
import { StationGeocodingCandidate } from '@/types/alipo';
import { useLanguage } from '@/lib/i18n';

const CandidateMapModal = dynamic(
  () => import('@/components/map/CandidateMapModal').then((mod) => mod.CandidateMapModal),
  { ssr: false }
);

type CandidateGroup = {
  key: string;
  primary: StationGeocodingCandidate;
  alternatives: StationGeocodingCandidate[];
};

type UserLocation = { latitude: number; longitude: number };

function distanceKm(from: UserLocation, to: { latitude: number; longitude: number }) {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latDelta = radians(to.latitude - from.latitude);
  const lonDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(lonDelta / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function StationCandidatesPage() {
  const { t } = useLanguage();
  const [candidates, setCandidates] = useState<StationGeocodingCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingKey, setWorkingKey] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState<'all' | 'high' | 'review'>('all');
  const [phone, setPhone] = useState('');
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [activeMapGroup, setActiveMapGroup] = useState<CandidateGroup | null>(null);

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setUserLocation({ latitude: coords.latitude, longitude: coords.longitude }),
      () => setUserLocation(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    );
  }, []);

  const loadCandidates = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/station-candidates', { cache: 'no-store' });
      const result = await response.json() as { candidates?: StationGeocodingCandidate[]; error?: string };
      if (!response.ok) throw new Error(result.error || t('Unable to load station candidates.'));
      setCandidates(result.candidates || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : t('Unable to load station candidates.'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { void loadCandidates(); }, [loadCandidates]);
  useEffect(() => { locateUser(); }, [locateUser]);

  const groups = useMemo(() => {
    const grouped = new Map<string, StationGeocodingCandidate[]>();
    for (const candidate of candidates) {
      const key = `${candidate.source}:${candidate.source_record_id}`;
      grouped.set(key, [...(grouped.get(key) || []), candidate]);
    }
    return Array.from(grouped, ([key, rows]): CandidateGroup => {
      const ordered = [...rows].sort((a, b) => b.confidence_score - a.confidence_score);
      return { key, primary: ordered[0], alternatives: ordered.slice(1) };
    }).filter(({ primary }) => filter === 'all' || (filter === 'high' ? primary.confidence_score >= 80 : primary.confidence_score < 80))
      .sort((a, b) => userLocation ? distanceKm(userLocation, a.primary) - distanceKm(userLocation, b.primary) : b.primary.confidence_score - a.primary.confidence_score);
  }, [candidates, filter, userLocation]);

  const review = async (group: CandidateGroup, action: 'accept' | 'reject' | 'create') => {
    const candidate = group.primary;
    if (phone.replace(/\D/g, '').length < 7) {
      setError(t('Enter a valid phone number to vote.'));
      return;
    }
    const prompt = action === 'reject'
      ? t('Reject {station}?', { station: candidate.source_name })
      : action === 'create'
        ? t('Create {station} as a new live station at the proposed coordinates?', { station: candidate.source_name })
        : t('Match {station} to {existing}?', { station: candidate.source_name, existing: candidate.nearest_station_name });
    if (!window.confirm(prompt)) return;

    setWorkingKey(group.key);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/station-candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidate_id: candidate.id,
          action,
          station_id: action === 'accept' ? candidate.nearest_station_id : null,
          phone,
        }),
      });
      const result = await response.json() as { error?: string; result?: { vote_count: number; confirmed: boolean } };
      if (!response.ok) throw new Error(result.error || t('Unable to review this candidate.'));
      if (result.result?.confirmed) {
        setCandidates((current) => current.filter((row) => `${row.source}:${row.source_record_id}` !== group.key));
        setMessage(t(action === 'reject' ? 'Candidate rejected.' : action === 'create' ? 'New station created.' : 'Candidate matched to the existing station.'));
      } else {
        const votes = result.result?.vote_count || 1;
        setCandidates((current) => current.map((row) => `${row.source}:${row.source_record_id}` === group.key ? { ...row, vote_counts: { ...row.vote_counts, [action]: votes } } : row));
        setMessage(t('Vote saved.'));
      }
    } catch (reviewError) {
      setError(reviewError instanceof Error ? reviewError.message : t('Unable to review this candidate.'));
    } finally {
      setWorkingKey(null);
    }
  };

  return (
    <main className="w-full max-w-7xl space-y-5 p-4 sm:p-6">
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800"><ShieldCheck className="h-3.5 w-3.5" /> {t('Community review')}</div>
        <h1 className="text-2xl font-black tracking-tight text-gray-950">{t('Candidate filling stations')}</h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">{t('Compare operator records with map results. During family testing, one community vote will confirm a match, reject a bad result, or create a genuinely missing station.')}</p>
      </div>
      <div className="flex gap-2"><Link href="/stations/add" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-800 px-4 text-xs font-black text-white"><Plus className="h-4 w-4" /> {t('Add a station')}</Link><button type="button" onClick={() => void loadCandidates()} disabled={loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 text-xs font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> {t('Refresh')}</button></div>
    </header>

    <section className="flex flex-wrap items-center gap-2 border-y border-gray-200 py-3">
      {(['all', 'high', 'review'] as const).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-10 rounded-full px-4 text-xs font-bold ${filter === value ? 'bg-emerald-900 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200'}`}>{value === 'all' ? t('All ({count})', { count: new Set(candidates.map((c) => `${c.source}:${c.source_record_id}`)).size }) : value === 'high' ? t('High confidence') : t('Needs review')}</button>)}
      <button type="button" onClick={locateUser} className="ml-auto inline-flex min-h-10 items-center gap-2 rounded-full bg-white px-4 text-xs font-bold text-gray-700 ring-1 ring-gray-200"><LocateFixed className="h-4 w-4 text-emerald-700" /> {t(userLocation ? 'Nearest first' : 'Sort by my distance')}</button>
    </section>

    <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
      <div><p className="text-sm font-black text-emerald-950">{t('Your phone number')}</p><p className="mt-1 text-xs text-emerald-800">{t('Used only to prevent duplicate votes. It is converted to a private fingerprint before storage.')}</p></div>
      <input inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+265…" className="mt-3 h-11 w-full rounded-xl border border-emerald-300 bg-white px-3 text-sm font-bold outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10 sm:mt-0 sm:max-w-xs" />
    </section>

    {error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</p> : null}
    {message ? <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</p> : null}

    {loading ? <div className="grid min-h-72 place-items-center rounded-2xl border border-gray-200 bg-white"><span className="inline-flex items-center gap-2 text-sm font-bold text-gray-500"><RefreshCw className="h-4 w-4 animate-spin text-emerald-600" /> {t('Loading candidate stations…')}</span></div> : groups.length === 0 ? <div className="grid min-h-72 place-items-center rounded-2xl border border-gray-200 bg-white text-center"><div><Check className="mx-auto h-8 w-8 text-emerald-600" /><p className="mt-3 font-black text-gray-900">{t('No candidates in this view')}</p><p className="mt-1 text-sm text-gray-500">{t('The review queue is clear for this filter.')}</p></div></div> : <div className="grid gap-4 lg:grid-cols-2">
      {groups.map((group) => {
        const c = group.primary;
        const tooCloseToCreate = c.nearest_station_distance_m <= 75;
        return <article key={group.key} className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-5">
            <div className="min-w-0"><p className="text-[10px] font-black uppercase tracking-[.14em] text-emerald-700">{c.operator_name} · {c.source_city || 'Malawi'}</p><h2 className="mt-1 truncate text-lg font-black text-gray-950">{c.source_name}</h2><p className="mt-1 text-xs leading-5 text-gray-500">{c.source_address || t('No official street address supplied')}</p>{userLocation ? <p className="mt-2 text-xs font-black text-emerald-700">{t('{distance} km from you', { distance: distanceKm(userLocation, c).toFixed(1) })}</p> : null}</div>
            <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-black ${c.confidence_score >= 80 ? 'bg-emerald-100 text-emerald-800' : c.confidence_score >= 60 ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{c.confidence_score}%</span>
          </div>

          <div className="grid gap-3 p-5 sm:grid-cols-2">
            <div className="rounded-xl bg-gray-50 p-4">
              <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('Proposed result')}</p>
              <p className="mt-2 text-sm font-black text-gray-900">{c.result_name || c.source_name}</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">{c.result_address || `${c.latitude.toFixed(5)}, ${c.longitude.toFixed(5)}`}</p>
              <button
                type="button"
                onClick={() => setActiveMapGroup(group)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50/80 px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 hover:border-emerald-700"
              >
                <MapPin className="h-3.5 w-3.5 text-emerald-700" /> {t('View proposed pin on map')}
              </button>
            </div>
            <div className="rounded-xl bg-emerald-50 p-4"><p className="text-[10px] font-black uppercase tracking-wider text-emerald-700">{t('Closest Alipo station')}</p><p className="mt-2 text-sm font-black text-gray-900">{c.nearest_station_name}</p><p className="mt-1 text-xs text-gray-600">{c.nearest_station_brand} · {t('{metres} m away', { metres: Math.round(c.nearest_station_distance_m) })}</p><p className="mt-3 text-[11px] font-semibold text-gray-500">{t(tooCloseToCreate ? 'Close enough that creating another pin could cause a duplicate.' : 'Far enough away to consider a new station.')}</p></div>
          </div>

          {group.alternatives.length ? <div className="mx-5 mb-4 rounded-xl border border-gray-200 px-4 py-3"><p className="text-[10px] font-black uppercase tracking-wider text-gray-400">{t('Other provider evidence')}</p>{group.alternatives.map((alt) => <p key={alt.id} className="mt-1.5 text-xs text-gray-600"><span className="font-bold capitalize">{alt.provider}</span>: {alt.result_name || t('Unnamed result')} · {alt.confidence_score}%</p>)}</div> : null}

          <div className="grid grid-cols-1 gap-2 border-t border-gray-100 bg-gray-50 p-4 sm:grid-cols-3">
            <button type="button" disabled={workingKey !== null} onClick={() => void review(group, 'accept')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-3 text-xs font-black text-white hover:bg-emerald-800 disabled:opacity-50"><Check className="h-4 w-4" /> {t('Match')}</button>
            <button type="button" disabled={workingKey !== null || tooCloseToCreate} onClick={() => void review(group, 'create')} title={tooCloseToCreate ? t('Use Match when an existing pin is within 75 metres.') : undefined} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 text-xs font-black text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-4 w-4" /> {t('Create')}</button>
            <button type="button" disabled={workingKey !== null} onClick={() => void review(group, 'reject')} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3 text-xs font-black text-red-700 hover:bg-red-50 disabled:opacity-50"><X className="h-4 w-4" /> {t('Reject')}</button>
          </div>
        </article>;
      })}
    </div>}

    <CandidateMapModal
      candidate={activeMapGroup?.primary || null}
      onClose={() => setActiveMapGroup(null)}
      onReview={(action) => {
        if (activeMapGroup) {
          void review(activeMapGroup, action);
          setActiveMapGroup(null);
        }
      }}
      reviewDisabled={workingKey !== null}
    />
    </main>
  );
}
