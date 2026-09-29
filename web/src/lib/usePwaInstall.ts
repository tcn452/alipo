'use client';

import { useCallback, useEffect, useState } from 'react';
import { trackPwaInstall } from '@/lib/gtag';

export interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISSED_KEY = 'alipo-install-prompt-dismissed';
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

type Listener = () => void;

let sharedInstallEvent: InstallPromptEvent | null = null;
let sharedIsIos = false;
let sharedIsStandalone = false;
let sharedListening = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

function isStandaloneDisplay(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
  );
}

function recordPwaInstall(
  platform?: string,
  trigger: 'prompt' | 'appinstalled' | 'standalone_open' = 'appinstalled'
) {
  if (typeof window === 'undefined') return;
  const alreadyLogged = localStorage.getItem('alipo-pwa-install-logged');
  if (alreadyLogged) return;
  localStorage.setItem('alipo-pwa-install-logged', 'true');

  const p = platform || (sharedIsIos ? 'ios' : /android/i.test(navigator.userAgent) ? 'android' : 'desktop');
  
  // Track in Google Analytics (gtag)
  trackPwaInstall(p, trigger);

  // Track in Supabase database
  void fetch('/api/pwa-install', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ platform: p }),
  }).catch(() => undefined);
}

function ensureInstallListener() {
  if (sharedListening || typeof window === 'undefined') return;
  sharedListening = true;
  sharedIsStandalone = isStandaloneDisplay();
  sharedIsIos = /iphone|ipad|ipod/i.test(navigator.userAgent);

  if (sharedIsStandalone || new URLSearchParams(window.location.search).get('source') === 'pwa') {
    recordPwaInstall(undefined, 'standalone_open');
    notify();
    return;
  }

  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    sharedInstallEvent = event as InstallPromptEvent;
    notify();
  });

  window.addEventListener('appinstalled', () => {
    sharedInstallEvent = null;
    sharedIsStandalone = true;
    recordPwaInstall(undefined, 'appinstalled');
    notify();
  });
}

export function usePwaInstall(options?: { deferRevealMs?: number; autoShowBanner?: boolean }) {
  const deferRevealMs = options?.deferRevealMs ?? 1800;
  const autoShowBanner = options?.autoShowBanner ?? true;
  const [, bump] = useState(0);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    ensureInstallListener();
    const onChange = () => bump((value) => value + 1);
    listeners.add(onChange);
    onChange();
    return () => {
      listeners.delete(onChange);
    };
  }, []);

  useEffect(() => {
    if (!autoShowBanner || sharedIsStandalone) return;
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    if (Date.now() - dismissedAt < DISMISS_FOR_MS) return;

    if (sharedIsIos) {
      const reveal = window.setTimeout(() => setShowBanner(true), deferRevealMs);
      return () => window.clearTimeout(reveal);
    }

    if (sharedInstallEvent) setShowBanner(true);
    const onChange = () => {
      if (sharedInstallEvent) setShowBanner(true);
      if (sharedIsStandalone) setShowBanner(false);
    };
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, [autoShowBanner, deferRevealMs]);

  const dismissBanner = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    setShowBanner(false);
  }, []);

  const install = useCallback(async () => {
    if (!sharedInstallEvent) return false;
    const event = sharedInstallEvent;
    await event.prompt();
    const choice = await event.userChoice;
    sharedInstallEvent = null;
    notify();
    if (choice.outcome === 'accepted') {
      setShowBanner(false);
      sharedIsStandalone = true;
      notify();
      return true;
    }
    return false;
  }, []);

  return {
    installEvent: sharedInstallEvent,
    showBanner,
    isIos: sharedIsIos,
    isStandalone: sharedIsStandalone,
    canOfferInstall: Boolean(sharedInstallEvent) || sharedIsIos,
    dismissBanner,
    install,
  };
}
