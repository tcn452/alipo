'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowRight, CheckCircle2, CircleAlert, Clock3, Info, List, Map as MapIcon, MapPin, RefreshCw, Search, ShieldCheck, XCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { ReportModal } from '@/components/ReportModal';
import { StationCard } from '@/components/StationCard';
import { CITIES } from '@/lib/constants';
import { pb } from '@/lib/pocketbase';
import { Station } from '@/types/alipo';
import { TimeAgo } from '@/components/TimeAgo';

const StationMap = dynamic(() => import('@/components/map/StationMap'), {
  ssr: false,
  loading: () => <div className="grid min-h-[540px] place-items-center bg-[#e7eadf] text-forest"><div className="text-center"><RefreshCw className="mx-auto mb-3 h-6 w-6 animate-spin" /><p className="text-sm font-bold">Loading the live fuel map</p></div></div>,
});

const SEED_TIME = Date.parse('2026-09-03T12:00:00+02:00');
const seededReportTime = (minutesAgo: number) => new Date(SEED_TIME - minutesAgo * 60000).toISOString();

const SEED_FALLBACK: Station[] = [
  { id: 'stat_llw_001', name: 'Puma Area 47', brand: 'Puma', latitude: -13.9572, longitude: 33.7915, district: 'Area 47', city: 'Lilongwe', verified: true, fuel_types: ['petrol', 'diesel'], latest_status: 'available', latest_queue: 'short', latest_price_petrol: 2530, latest_price_diesel: 2734, last_reported_at: seededReportTime(15) },
  { id: 'stat_llw_002', name: 'TotalEnergies City Centre', brand: 'Total', latitude: -13.9712, longitude: 33.7845, district: 'City Centre', city: 'Lilongwe', verified: true, fuel_types: ['petrol', 'diesel'], latest_status: 'available', latest_queue: 'medium', latest_price_petrol: 2530, latest_price_diesel: 2734, last_reported_at: seededReportTime(35) },
  { id: 'stat_llw_003', name: 'Petroda Kanengo Industrial', brand: 'Petroda', latitude: -13.8821, longitude: 33.7741, district: 'Kanengo', city: 'Lilongwe', verified: true, fuel_types: ['petrol', 'diesel'], latest_status: 'low', latest_queue: 'long', latest_price_petrol: 2530, latest_price_diesel: 2734, last_reported_at: seededReportTime(50) },
  { id: 'stat_llw_004', name: 'OilCom Old Town', brand: 'OilCom', latitude: -13.9845, longitude: 33.7689, district: 'Old Town', city: 'Lilongwe', verified: true, fuel_types: ['petrol', 'diesel'], latest_status: 'out', latest_queue: 'none', latest_price_petrol: 2530, latest_price_diesel: 2734, last_reported_at: seededReportTime(120) },
  { id: 'stat_bt_001', name: 'TotalEnergies Chichiri', brand: 'Total', latitude: -15.7981, longitude: 35.0254, district: 'Chichiri', city: 'Blantyre', verified: true, fuel_types: ['petrol', 'diesel'], latest_status: 'available', latest_queue: 'short', latest_price_petrol: 2530, latest_price_diesel: 2734, last_reported_at: seededReportTime(25) },
  { id: 'stat_bt_002', name: 'Puma Ginnery Corner', brand: 'Puma', latitude: -15.7925, longitude: 35.0118, district: 'Ginnery Corner', city: 'Blantyre', verified: true, fuel_types: ['petrol', 'diesel'], latest_status: 'low', latest_queue: 'long', latest_price_petrol: 2530, latest_price_diesel: 2734, last_reported_at: seededReportTime(60) },
];

const STATUS_FILTERS = [{ id: 'all', label: 'All reports' }, { id: 'available', label: 'Available' }, { id: 'low', label: 'Low supply' }, { id: 'out', label: 'No fuel' }];

export default function HomePage() {
  const [stations, setStations] = useState<Station[]>(SEED_FALLBACK);
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStation, setSelectedStation] = useState<Station | null>(SEED_FALLBACK[0]);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'list'>('list');
  const [loading, setLoading] = useState(false);

  const fetchStations = async () => {
    setLoading(true);
    try {
      const records = await pb.collection('stations').getFullList({ sort: '-updated' });
      if (records.length) setStations(records as unknown as Station[]);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => {
    fetchStations();
    try {
      void pb.collection('stations').subscribe('*', (event) => {
        if (event.action === 'create') setStations((current) => [event.record as unknown as Station, ...current]);
        if (event.action === 'update') setStations((current) => current.map((station) => station.id === event.record.id ? event.record as unknown as Station : station));
        if (event.action === 'delete') setStations((current) => current.filter((station) => station.id !== event.record.id));
      }).catch(() => {});
    } catch {}
    return () => { try { void pb.collection('stations').unsubscribe('*').catch(() => {}); } catch {} };
  }, []);

  const filteredStations = useMemo(() => stations.filter((station) => {
    if (selectedCity !== 'All Cities' && station.city !== selectedCity) return false;
    if (selectedStatus !== 'all' && station.latest_status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return [station.name, station.district, station.brand].some((value) => value.toLowerCase().includes(query));
    }
    return true;
  }), [stations, selectedCity, selectedStatus, searchQuery]);

  const mapCenter: [number, number] = selectedCity === 'Blantyre' ? [-15.7861, 35.0058] : selectedCity === 'Mzuzu' ? [-11.4589, 34.0152] : selectedCity === 'Zomba' ? [-15.3833, 35.3333] : [-13.9626, 33.7741];
  const stats = useMemo(() => ({ available: filteredStations.filter((station) => station.latest_status === 'available').length, low: filteredStations.filter((station) => station.latest_status === 'low').length, out: filteredStations.filter((station) => station.latest_status === 'out').length }), [filteredStations]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-ivory text-ink">
      <Header onOpenReport={() => setIsReportModalOpen(true)} />
      <main>
        <section className="overflow-hidden bg-forest text-white">
          <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[1.35fr_.65fr]">
            <div className="relative border-b border-white/10 px-5 py-10 sm:px-8 lg:border-b-0 lg:border-r lg:px-12 lg:py-12">
              <div className="absolute right-8 top-6 hidden h-44 w-44 rounded-full border border-white/10 lg:block" />
              <p className="eyebrow text-[#f5aa54]">Malawi&apos;s live fuel network</p>
              <h1 className="mt-4 max-w-3xl font-display text-4xl leading-[.96] tracking-[-0.04em] sm:text-6xl lg:text-7xl">Fuel is there.<br />You&apos;re not alone.</h1>
              <p className="mt-5 max-w-xl text-sm leading-6 text-white/70 sm:text-base">Find fuel, see queue times and share what you know. Built for every driver moving through Malawi.</p>
            </div>
            <div className="grid grid-cols-3 lg:grid-cols-1">
              {[
                { label: 'Fuel available', value: stats.available, icon: CheckCircle2, color: 'text-[#9bcf79]' },
                { label: 'Running low', value: stats.low, icon: CircleAlert, color: 'text-[#f5aa54]' },
                { label: 'No fuel', value: stats.out, icon: XCircle, color: 'text-[#ef7c5d]' },
              ].map(({ label, value, icon: Icon, color }) => <div key={label} className="flex min-w-0 items-center gap-2 border-r border-white/10 px-3 py-5 last:border-r-0 sm:gap-3 sm:px-4 lg:border-b lg:border-r-0 lg:px-8 lg:last:border-b-0"><Icon className={`h-5 w-5 shrink-0 ${color}`} /><div className="min-w-0"><p className="text-2xl font-black leading-none">{value}</p><p className="mt-1 text-[9px] font-bold uppercase leading-3 tracking-[.12em] text-white/55 sm:text-xs">{label}</p></div></div>)}
            </div>
          </div>
        </section>

        <section className="sticky top-[72px] z-20 border-b border-line bg-ivory/95 backdrop-blur-xl">
          <div className="mx-auto max-w-[1440px] px-4 py-4 sm:px-8 lg:px-12">
            <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_auto] lg:items-center">
              <label className="relative block"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" /><span className="sr-only">Search station or area</span><input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search station, area or brand" className="h-12 w-full border border-line bg-white pl-11 pr-4 text-sm outline-none transition focus:border-forest focus:ring-2 focus:ring-forest/10" /></label>
              <div className="no-scrollbar flex gap-2 overflow-x-auto">{CITIES.slice(0, 5).map((city) => <button key={city} onClick={() => setSelectedCity(city)} className={`h-10 whitespace-nowrap px-4 text-xs font-bold transition ${selectedCity === city ? 'bg-forest text-white' : 'border border-line bg-white text-ink hover:border-forest'}`}>{city === 'All Cities' ? 'All Malawi' : city}</button>)}</div>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="no-scrollbar flex gap-2 overflow-x-auto">{STATUS_FILTERS.map((filter) => <button key={filter.id} onClick={() => setSelectedStatus(filter.id)} className={`inline-flex h-9 items-center gap-2 whitespace-nowrap px-3 text-xs font-bold transition ${selectedStatus === filter.id ? 'bg-[#dfead7] text-forest' : 'text-muted hover:bg-white'}`}>{filter.id !== 'all' && <span className={`h-2 w-2 rounded-full ${filter.id === 'available' ? 'bg-[#398151]' : filter.id === 'low' ? 'bg-[#df972f]' : 'bg-[#c9583c]'}`} />}{filter.label}</button>)}</div>
              <div className="flex border border-line bg-white lg:hidden"><button aria-label="Show station list" onClick={() => setActiveTab('list')} className={`p-2.5 ${activeTab === 'list' ? 'bg-forest text-white' : 'text-muted'}`}><List className="h-4 w-4" /></button><button aria-label="Show map" onClick={() => setActiveTab('map')} className={`p-2.5 ${activeTab === 'map' ? 'bg-forest text-white' : 'text-muted'}`}><MapIcon className="h-4 w-4" /></button></div>
            </div>
          </div>
        </section>

        <section className="mx-auto grid max-w-[1440px] lg:min-h-[720px] lg:grid-cols-[440px_minmax(0,1fr)]">
          <aside className={`${activeTab === 'map' ? 'hidden lg:block' : 'block'} border-r border-line bg-[#f8f5ee] px-4 py-6 sm:px-8 lg:px-7`}>
            <div className="mb-5 flex items-end justify-between"><div><p className="eyebrow text-orange">Live near you</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em]">{filteredStations.length} fuel stations</h2></div><button onClick={fetchStations} className="inline-flex items-center gap-2 text-xs font-bold text-forest"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh</button></div>
            {filteredStations.length ? <div className="space-y-3 lg:max-h-[650px] lg:overflow-y-auto lg:pr-2">{filteredStations.map((station) => <StationCard key={station.id} station={station} isSelected={selectedStation?.id === station.id} onSelectStation={setSelectedStation} onReportClick={(item) => { setSelectedStation(item); setIsReportModalOpen(true); }} />)}</div> : <div className="border border-line bg-white p-8 text-center"><Info className="mx-auto h-6 w-6 text-muted" /><p className="mt-3 font-bold">No matching stations</p><p className="mt-1 text-sm text-muted">Try another area or fuel status.</p></div>}
          </aside>

          <div className={`${activeTab === 'list' ? 'hidden lg:block' : 'block'} relative min-h-[610px] bg-[#dce2d6] lg:min-h-[720px]`}>
            <StationMap stations={filteredStations} selectedStation={selectedStation} onSelectStation={setSelectedStation} center={mapCenter} zoom={selectedCity === 'All Cities' ? 7 : 12} />
            {selectedStation && <div className="absolute bottom-5 left-4 right-4 z-[400] border border-black/10 bg-white p-5 shadow-[0_24px_70px_rgba(5,48,33,.22)] sm:left-6 sm:right-auto sm:w-[410px]">
              <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-[.14em] text-forest"><ShieldCheck className="h-4 w-4" /> Station verified</div><h3 className="mt-2 text-xl font-black tracking-[-.03em]">{selectedStation.name}</h3><p className="mt-1 flex items-center gap-1 text-xs text-muted"><MapPin className="h-3.5 w-3.5" /> {selectedStation.district}, {selectedStation.city}</p></div><span className="whitespace-nowrap bg-[#e1edd9] px-3 py-1.5 text-xs font-black text-forest">Fuel available</span></div>
              <div className="mt-4 grid grid-cols-3 border-y border-line py-3 text-xs"><div><span className="block text-muted">Petrol</span><strong className="font-mono">MWK {selectedStation.latest_price_petrol?.toLocaleString() || '—'}</strong></div><div><span className="block text-muted">Diesel</span><strong className="font-mono">MWK {selectedStation.latest_price_diesel?.toLocaleString() || '—'}</strong></div><div><span className="block text-muted">Updated</span><strong><TimeAgo date={selectedStation.last_reported_at || selectedStation.updated} /></strong></div></div>
              <a href="#report-fuel" onClick={() => setIsReportModalOpen(true)} className="mt-4 inline-flex w-full items-center justify-between bg-forest px-4 py-3 text-sm font-black text-white transition hover:bg-[#0b5940]">Report an update <ArrowRight className="h-4 w-4" /></a>
            </div>}
          </div>
        </section>

        <section className="border-t border-line bg-[#eee9dd]"><div className="mx-auto grid max-w-[1440px] gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-12"><div><p className="eyebrow text-orange">No data? No problem.</p><h2 className="mt-2 text-xl font-black">Alipo works for every phone.</h2></div><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center border border-forest/20 text-forest"><Clock3 className="h-5 w-5" /></div><div><p className="text-xs text-muted">Dial from any network</p><p className="font-mono font-bold">*384*265#</p></div></div><div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center border border-forest/20 text-forest"><MapPin className="h-5 w-5" /></div><div><p className="text-xs text-muted">Community reports</p><p className="font-bold">Built around Malawi</p></div></div></div></section>
      </main>
      <footer className="bg-[#032e20] px-5 py-6 text-xs text-white/55"><div className="mx-auto flex max-w-[1440px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><p><strong className="text-white">Alipo</strong> — Find fuel. Share updates. Keep Malawi moving.</p><p>USSD *384*265# · WhatsApp +265 888 000 100</p></div></footer>
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} stations={stations} selectedStation={selectedStation} onReportSubmitted={fetchStations} />
    </div>
  );
}
