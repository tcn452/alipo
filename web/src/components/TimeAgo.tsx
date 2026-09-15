'use client';

import { useEffect, useState } from 'react';
import { formatTimeAgo } from '@/lib/utils';
import { useLanguage } from '@/lib/i18n';

interface TimeAgoProps {
  date?: string;
  fallback?: string;
}

export function TimeAgo({ date, fallback = 'Recently' }: TimeAgoProps) {
  const { language, t } = useLanguage();
  const [label, setLabel] = useState(t(fallback));

  useEffect(() => {
    const updateLabel = () => setLabel(formatTimeAgo(date, language));
    updateLabel();
    const timer = window.setInterval(updateLabel, 60_000);
    return () => window.clearInterval(timer);
  }, [date, language]);

  return <>{label}</>;
}
