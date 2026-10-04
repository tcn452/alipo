'use client';
import { useEffect, useRef } from 'react';
import { trackEvent } from '@/lib/gtag';
export function AreaReportViewed({ area, fuel }: { area: string; fuel: string }) {
  const seen = useRef(false);
  useEffect(() => { if (!seen.current) { seen.current = true; trackEvent('area_report_viewed', { area_id: area, fuel_type: fuel, content_type: 'area_status' }); } }, [area, fuel]);
  return null;
}
