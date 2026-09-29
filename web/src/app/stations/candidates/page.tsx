'use client';

import { useEffect, useState } from 'react';
import { Header } from '@/components/Header';
import StationCandidatesPage from '@/app/dashboard/stations/candidates/page';
import { LAUNCH_DATE, LAUNCH_BYPASS_STORAGE_KEY } from '@/lib/constants';

export default function PublicStationCandidatesPage() {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (Date.now() < LAUNCH_DATE.getTime() && localStorage.getItem(LAUNCH_BYPASS_STORAGE_KEY) !== 'true') {
      window.location.replace('/');
      return;
    }
    setAllowed(true);
  }, []);

  if (!allowed) return null;

  return <div className="min-h-screen bg-[#f6f4ee]"><Header /><StationCandidatesPage /></div>;
}
