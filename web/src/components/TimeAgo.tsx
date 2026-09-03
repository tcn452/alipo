'use client';

import { useEffect, useState } from 'react';
import { formatTimeAgo } from '@/lib/utils';

interface TimeAgoProps {
  date?: string;
  fallback?: string;
}

export function TimeAgo({ date, fallback = 'Recently' }: TimeAgoProps) {
  const [label, setLabel] = useState(fallback);

  useEffect(() => {
    const updateLabel = () => setLabel(formatTimeAgo(date));
    updateLabel();
    const timer = window.setInterval(updateLabel, 60_000);
    return () => window.clearInterval(timer);
  }, [date]);

  return <>{label}</>;
}
