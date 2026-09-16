'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, RefreshCw, ThumbsUp, X } from 'lucide-react';
import { Station } from '@/types/alipo';
import { useLanguage } from '@/lib/i18n';

interface Suggestion { station: Station; suggested_name: string; votes: number; }
interface Props { isOpen: boolean; onClose: () => void; onConfirmed: () => void; }

export function NameSuggestions({ isOpen, onClose, onConfirmed }: Props) {
  const { t } = useLanguage();
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [votingId, setVotingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadSuggestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/name-suggestions', { cache: 'no-store' });
      const result = await response.json() as { suggestions?: Suggestion[]; error?: string };
      if (!response.ok) throw new Error(result.error || 'Unable to load suggested names.');
      setSuggestions(result.suggestions || []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load suggested names.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    void loadSuggestions();
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, loadSuggestions, onClose]);

  const vote = async (suggestion: Suggestion) => {
    if (phone.replace(/\D/g, '').length < 7) {
      setError(t('Enter a valid phone number to vote.'));
      return;
    }
    setVotingId(suggestion.station.id);
    setError('');
    setMessage('');
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ station: suggestion.station, report_type: 'name_suggestion', suggested_name: suggestion.suggested_name, phone }),
      });
      const result = await response.json() as { error?: string; confirmed?: boolean; votes?: number };
      if (!response.ok) throw new Error(result.error || 'Unable to save your vote.');
      setMessage(t(result.confirmed ? 'Name confirmed. Thank you for voting.' : 'Vote saved. One more matching vote will confirm this name.'));
      if (result.confirmed) {
        setSuggestions((current) => current.filter((item) => item.station.id !== suggestion.station.id));
        onConfirmed();
      } else {
        setSuggestions((current) => current.map((item) => item.station.id === suggestion.station.id ? { ...item, votes: result.votes || item.votes } : item));
      }
    } catch (voteError) {
      setError(voteError instanceof Error ? voteError.message : 'Unable to save your vote.');
    } finally { setVotingId(null); }
  };

  if (!isOpen) return null;
  return <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[1000] flex items-end bg-black/45 sm:items-center sm:justify-center sm:p-6">
    <section role="dialog" aria-modal="true" aria-labelledby="suggestions-title" className="flex max-h-[88dvh] w-full flex-col bg-ivory shadow-[0_24px_70px_rgba(3,46,32,.3)] sm:max-w-2xl">
      <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-5 sm:px-7">
        <div><h2 id="suggestions-title" className="text-2xl font-black tracking-[-.03em]">{t('Confirm suggested filling station names')}</h2><p className="mt-1 text-sm leading-5 text-muted">{t('Help confirm station names shared by the community.')}</p></div>
        <button ref={closeButtonRef} type="button" onClick={onClose} aria-label={t('Close suggested names')} className="grid h-11 w-11 shrink-0 place-items-center text-forest hover:bg-[#e5eddc] focus:outline-none focus:ring-2 focus:ring-forest"><X className="h-5 w-5" /></button>
      </header>
      <div className="border-b border-line bg-white px-5 py-4 sm:px-7"><label className="block text-xs font-black text-ink">{t('Your phone number')} <span className="font-normal text-muted">· {t('used only to prevent duplicate votes')}</span><input inputMode="tel" autoComplete="tel" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+265…" className="mt-2 h-11 w-full border border-line bg-white px-3 text-sm outline-none focus:border-forest focus:ring-2 focus:ring-forest/10" /></label></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-7">
        {error ? <p role="alert" className="mb-4 bg-[#f9e1d9] px-4 py-3 text-sm font-bold text-[#8a301f]">{t(error)}</p> : null}
        {message ? <p role="status" className="mb-4 bg-[#e1edd9] px-4 py-3 text-sm font-bold text-forest">{message}</p> : null}
        {loading ? <div role="status" className="grid min-h-48 place-items-center text-sm font-bold text-muted"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin text-orange" /> {t('Loading suggested names…')}</span></div> : error ? null : suggestions.length ? <ul className="divide-y divide-line border-y border-line">{suggestions.map((suggestion) => <li key={suggestion.station.id} className="py-4"><div className="flex min-w-0 items-center gap-3"><div className="min-w-0 flex-1"><p className="truncate text-xs text-muted">{suggestion.station.name} · {suggestion.station.city}</p><p className="mt-1 text-base font-black text-ink">{suggestion.suggested_name}</p><p className="mt-1 text-[11px] font-bold text-forest">{t('{count} of 2 votes', { count: suggestion.votes })}</p></div><button type="button" disabled={votingId !== null} onClick={() => { void vote(suggestion); }} className="inline-flex min-h-11 shrink-0 items-center gap-2 bg-forest px-4 text-xs font-black text-white transition hover:bg-[#0b5940] disabled:opacity-55">{votingId === suggestion.station.id ? <RefreshCw className="h-4 w-4 animate-spin" /> : <ThumbsUp className="h-4 w-4" />} {t('Vote')}</button></div></li>)}</ul> : <div className="grid min-h-48 place-items-center text-center"><div><Check className="mx-auto h-7 w-7 text-forest" /><p className="mt-3 font-black">{t('No names awaiting votes')}</p><p className="mt-1 text-sm text-muted">{t('The community has reviewed every suggestion for now.')}</p></div></div>}
      </div>
    </section>
  </div>;
}
