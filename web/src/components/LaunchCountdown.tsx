'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { 
  Download, 
  Share2, 
  Smartphone, 
  CheckCircle2, 
  Clock, 
  Fuel, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  Languages, 
  ArrowRight, 
  X, 
  Key, 
  Lock, 
  ChevronRight,
  Info
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { LAUNCH_DATE, LAUNCH_BYPASS_STORAGE_KEY, LAUNCH_PASSCODE } from '@/lib/constants';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface LaunchCountdownProps {
  onUnlock?: () => void;
}

export function LaunchCountdown({ onUnlock }: LaunchCountdownProps) {
  const { language, setLanguage, t } = useLanguage();

  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalMs: number;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 1 });

  const [mounted, setMounted] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [activeGuideTab, setActiveGuideTab] = useState<'android' | 'ios' | 'desktop'>('android');
  
  // Team bypass state
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState(false);

  useEffect(() => {
    setMounted(true);

    const ua = navigator.userAgent.toLowerCase();
    const ios = /iphone|ipad|ipod/.test(ua);
    const android = /android/.test(ua);
    setIsIos(ios);
    setIsAndroid(android);
    if (ios) setActiveGuideTab('ios');
    else if (android) setActiveGuideTab('android');
    else setActiveGuideTab('desktop');

    const standalone = window.matchMedia('(display-mode: standalone)').matches || 
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    setIsInstalled(standalone);

    // Listen for PWA install prompt
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    // Check if app is installed via appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);

    // Calculate time left
    const updateCountdown = () => {
      const now = Date.now();
      const diff = Math.max(0, LAUNCH_DATE.getTime() - now);
      
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, totalMs: diff });
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => {
      clearInterval(timer);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setIsInstalled(true);
        }
        setDeferredPrompt(null);
      } catch {
        setShowInstallGuide(true);
      }
    } else {
      setShowInstallGuide(true);
    }
  };

  const handlePasscodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode.trim() === LAUNCH_PASSCODE || passcode.trim() === 'alipo') {
      localStorage.setItem(LAUNCH_BYPASS_STORAGE_KEY, 'true');
      setShowPasscodeModal(false);
      onUnlock?.();
    } else {
      setPasscodeError(true);
    }
  };

  const getWhatsAppShareUrl = () => {
    const text = language === 'ny'
      ? 'Alipo ikukhazikitsidwa pa 1st October! Ikani pulogalamuyi pa foni yanu tsopano kuti muzidziwa za mafuta ku Malawi: https://alipo.net'
      : 'Alipo is launching on October 1st! Download the app to your phone now to track real-time petrol & diesel across Malawi: https://alipo.net';
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
  };

  const isLive = mounted && timeLeft.totalMs <= 0;

  return (
    <div className="relative min-h-screen bg-[#032419] text-[#f7f3e9] flex flex-col justify-between selection:bg-[#f5aa54] selection:text-[#032419]">
      {/* Background ambient lighting */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-[#0e5c3e]/40 to-transparent blur-3xl opacity-70" />
        <div className="absolute top-1/3 -right-40 w-[450px] h-[450px] bg-[#f5aa54]/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-10 -left-40 w-[500px] h-[500px] bg-[#094730]/60 blur-[130px] rounded-full" />
      </div>

      {/* Top Header */}
      <header className="relative z-10 border-b border-white/10 bg-[#032419]/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-6xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-3">
            <Image
              src="/alipo-mark.png"
              alt="Alipo logo"
              width={42}
              height={55}
              priority
              className="h-10 w-auto object-contain sm:hidden"
            />
            <Image
              src="/alipo-lockup.png"
              alt="Alipo — Malawi Fuel Network"
              width={160}
              height={52}
              priority
              className="hidden h-11 w-auto object-contain sm:block"
            />
          </div>

          <div className="flex items-center gap-3">
            {/* Language toggle */}
            <div className="flex items-center border border-white/20 bg-white/5 p-1 rounded-sm">
              <Languages className="mx-1 h-3.5 w-3.5 text-white/50" />
              <button
                type="button"
                onClick={() => setLanguage('en')}
                aria-pressed={language === 'en'}
                className={`h-7 px-2.5 text-xs font-black transition ${
                  language === 'en' ? 'bg-[#f5aa54] text-[#032419]' : 'text-white/70 hover:text-white'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('ny')}
                aria-pressed={language === 'ny'}
                className={`h-7 px-2.5 text-xs font-black transition ${
                  language === 'ny' ? 'bg-[#f5aa54] text-[#032419]' : 'text-white/70 hover:text-white'
                }`}
              >
                CH
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 mx-auto w-full max-w-4xl px-4 py-8 sm:py-14 flex-1 flex flex-col justify-center items-center text-center">
        
        {/* Launch Pill */}
        <div className="inline-flex items-center gap-2 border border-[#f5aa54]/40 bg-[#f5aa54]/10 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider text-[#f5aa54] mb-6 shadow-sm">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f5aa54] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#f5aa54]"></span>
          </span>
          {t('Official Launch')} • 1st October 2026
        </div>

        {/* Hero Title */}
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight text-white max-w-2xl leading-[1.1]">
          {isLive ? (
            <span className="text-[#f5aa54]">{t('Alipo is now LIVE!')}</span>
          ) : (
            <>
              {language === 'ny' ? (
                <>Netiweki ya Mafuta ya ku Malawi <span className="text-[#f5aa54]">Ikukhazikitsidwa</span></>
              ) : (
                <>Malawi’s Live Fuel Network <span className="text-[#f5aa54]">Is Launching</span></>
              )}
            </>
          )}
        </h1>

        <p className="mt-4 text-sm sm:text-base text-white/75 max-w-xl leading-relaxed">
          {t('Real-time crowdsourced & verified petrol and diesel tracker for Lilongwe, Blantyre, Mzuzu, Zomba and all national roads.')}
        </p>

        {/* Countdown Timer Block */}
        {!isLive ? (
          <div className="mt-8 sm:mt-12 w-full max-w-2xl">
            <p className="text-xs uppercase tracking-widest font-black text-white/60 mb-3">
              {t('Malawi’s live fuel network is launching in:')}
            </p>

            <div className="grid grid-cols-4 gap-2.5 sm:gap-4">
              {/* Days */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-5 bg-white/5 border border-white/15 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.25)] backdrop-blur-sm">
                <span className="text-3xl sm:text-5xl md:text-6xl font-black font-mono text-[#f5aa54] tabular-nums">
                  {mounted ? String(timeLeft.days).padStart(2, '0') : '01'}
                </span>
                <span className="mt-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/70">
                  {timeLeft.days === 1 ? t('Day') : t('Days')}
                </span>
              </div>

              {/* Hours */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-5 bg-white/5 border border-white/15 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.25)] backdrop-blur-sm">
                <span className="text-3xl sm:text-5xl md:text-6xl font-black font-mono text-white tabular-nums">
                  {mounted ? String(timeLeft.hours).padStart(2, '0') : '13'}
                </span>
                <span className="mt-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/70">
                  {timeLeft.hours === 1 ? t('Hour') : t('Hours')}
                </span>
              </div>

              {/* Minutes */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-5 bg-white/5 border border-white/15 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.25)] backdrop-blur-sm">
                <span className="text-3xl sm:text-5xl md:text-6xl font-black font-mono text-white tabular-nums">
                  {mounted ? String(timeLeft.minutes).padStart(2, '0') : '30'}
                </span>
                <span className="mt-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/70">
                  {timeLeft.minutes === 1 ? t('Minute') : t('Minutes')}
                </span>
              </div>

              {/* Seconds */}
              <div className="flex flex-col items-center justify-center p-3 sm:p-5 bg-white/5 border border-white/15 rounded-xl shadow-[0_8px_30px_rgb(0,0,0,0.25)] backdrop-blur-sm">
                <span className="text-3xl sm:text-5xl md:text-6xl font-black font-mono text-[#f5aa54] tabular-nums">
                  {mounted ? String(timeLeft.seconds).padStart(2, '0') : '00'}
                </span>
                <span className="mt-1 text-[10px] sm:text-xs font-black uppercase tracking-wider text-white/70">
                  {timeLeft.seconds === 1 ? t('Second') : t('Seconds')}
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => { onUnlock?.(); }}
              className="inline-flex items-center gap-3 bg-[#f5aa54] hover:bg-[#e09843] text-[#032419] px-8 py-4 rounded-xl font-black text-lg transition shadow-xl"
            >
              <span>{t('Enter live app')}</span>
              <ArrowRight className="h-6 w-6" />
            </button>
          </div>
        )}

        {/* Download App Container ("Allow people to download the app") */}
        <section className="mt-10 sm:mt-14 w-full max-w-2xl bg-gradient-to-br from-white/10 to-white/5 border-2 border-[#f5aa54]/40 rounded-2xl p-6 sm:p-8 text-left shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-[#f5aa54]/10 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#f5aa54]">
                <Smartphone className="h-4 w-4" />
                <span>{t('Install on your phone')}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                {t('Get Alipo on your phone today')}
              </h2>
              <p className="text-xs sm:text-sm text-white/70 max-w-md leading-relaxed">
                {t('Install the Alipo app now so you are ready with 1-tap fuel updates the moment we launch on October 1st.')}
              </p>
            </div>

            <div className="flex flex-col sm:shrink-0 gap-2.5">
              {isInstalled ? (
                <div className="inline-flex items-center justify-center gap-2 bg-[#06452f] border border-[#f5aa54] text-[#f5aa54] px-6 py-3.5 rounded-xl font-black text-sm">
                  <CheckCircle2 className="h-5 w-5" />
                  <span>{t('App Installed!')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="inline-flex items-center justify-center gap-2.5 bg-[#f5aa54] hover:bg-[#e69b40] text-[#032419] px-6 py-4 rounded-xl font-black text-sm transition transform active:scale-95 shadow-lg"
                >
                  <Download className="h-5 w-5 stroke-[2.5]" />
                  <span>{t('Download App')}</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowInstallGuide(true)}
                className="text-xs text-white/80 hover:text-white underline underline-offset-4 text-center py-1 transition"
              >
                {t('How to install')} (Android & iOS)
              </button>
            </div>
          </div>

          {/* Value props badges */}
          <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-white/80">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[#f5aa54] shrink-0" />
              <span>{t('Uses less than 1MB of bundle data and works even on 2G/3G connections.')}</span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#f5aa54] shrink-0" />
              <span>{t('Be ready for launch day. Installs directly to your home screen with zero data wastage.')}</span>
            </div>
          </div>
        </section>

        {/* WhatsApp Share CTA */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full max-w-md">
          <a
            href={getWhatsAppShareUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full inline-flex items-center justify-center gap-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white px-5 py-3 rounded-xl font-black text-xs uppercase tracking-wider transition shadow-md"
          >
            <Share2 className="h-4 w-4" />
            <span>{t('Share on WhatsApp')}</span>
          </a>
        </div>

        {/* Feature Teasers */}
        <section className="mt-14 w-full max-w-4xl text-left">
          <h3 className="text-xs uppercase font-black tracking-widest text-[#f5aa54] mb-4 text-center">
            {t('What is coming on October 1st?')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
              <div className="h-9 w-9 rounded-lg bg-[#06452f] text-[#f5aa54] flex items-center justify-center mb-3">
                <Fuel className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-white text-sm mb-1">{t('Live Petrol & Diesel Stock')}</h4>
              <p className="text-xs text-white/65 leading-relaxed">
                {t('Know which stations are pumping and which are dry before you leave home.')}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
              <div className="h-9 w-9 rounded-lg bg-[#06452f] text-[#f5aa54] flex items-center justify-center mb-3">
                <Clock className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-white text-sm mb-1">{t('Queue Times & Wait Estimates')}</h4>
              <p className="text-xs text-white/65 leading-relaxed">
                {t('See crowd-reported queue lengths to avoid long lines at the pump.')}
              </p>
            </div>

            <div className="bg-white/5 border border-white/10 p-5 rounded-xl">
              <div className="h-9 w-9 rounded-lg bg-[#06452f] text-[#f5aa54] flex items-center justify-center mb-3">
                <Users className="h-5 w-5" />
              </div>
              <h4 className="font-bold text-white text-sm mb-1">{t('Nationwide Coverage')}</h4>
              <p className="text-xs text-white/65 leading-relaxed">
                {t('Lilongwe, Blantyre, Mzuzu, Zomba, Kasungu, Mangochi, Salima and highway stops.')}
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 py-6 text-center text-xs text-white/50">
        <div className="mx-auto max-w-6xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 Alipo • {t('Malawi Fuel Availability Network')}</p>
          <div className="flex items-center gap-5">
            <Link href="/privacy" className="hover:text-white underline underline-offset-4">
              Privacy Policy
            </Link>
            <button
              type="button"
              onClick={() => setShowPasscodeModal(true)}
              className="inline-flex items-center gap-1.5 hover:text-white transition"
              title="Internal team unlock"
            >
              <Key className="h-3 w-3" />
              <span>{t('Team access')}</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Step-by-Step Install Guide Modal */}
      {showInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md bg-[#042d1f] border border-white/20 rounded-2xl p-6 text-white shadow-2xl">
            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-white/60 hover:text-white bg-white/5 hover:bg-white/10"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-xl bg-[#f5aa54] text-[#032419] flex items-center justify-center font-black">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white">{t('Download & Install Alipo')}</h3>
                <p className="text-xs text-white/60">{t('Add to your phone home screen')}</p>
              </div>
            </div>

            {/* Platform switcher tabs */}
            <div className="grid grid-cols-3 gap-1 bg-white/10 p-1 rounded-lg text-xs font-bold mb-5">
              <button
                type="button"
                onClick={() => setActiveGuideTab('android')}
                className={`py-1.5 rounded-md transition ${activeGuideTab === 'android' ? 'bg-[#f5aa54] text-[#032419]' : 'text-white/80 hover:text-white'}`}
              >
                Android
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('ios')}
                className={`py-1.5 rounded-md transition ${activeGuideTab === 'ios' ? 'bg-[#f5aa54] text-[#032419]' : 'text-white/80 hover:text-white'}`}
              >
                iPhone (iOS)
              </button>
              <button
                type="button"
                onClick={() => setActiveGuideTab('desktop')}
                className={`py-1.5 rounded-md transition ${activeGuideTab === 'desktop' ? 'bg-[#f5aa54] text-[#032419]' : 'text-white/80 hover:text-white'}`}
              >
                Computer
              </button>
            </div>

            {/* Android Guide */}
            {activeGuideTab === 'android' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5aa54] text-[#032419] font-black text-xs">1</span>
                  <p className="pt-0.5 leading-relaxed">{t('Tap the 3 dots menu (⋮)')} in Chrome or your phone browser.</p>
                </div>
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5aa54] text-[#032419] font-black text-xs">2</span>
                  <p className="pt-0.5 leading-relaxed">{t('Select "Install app" or "Add to Home screen"')}.</p>
                </div>
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5aa54] text-[#032419] font-black text-xs">3</span>
                  <p className="pt-0.5 leading-relaxed">{t('Confirm installation')}. The Alipo icon will appear on your phone!</p>
                </div>
              </div>
            )}

            {/* iOS Guide */}
            {activeGuideTab === 'ios' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5aa54] text-[#032419] font-black text-xs">1</span>
                  <p className="pt-0.5 leading-relaxed">Open this page in <strong>Safari</strong> on your iPhone or iPad.</p>
                </div>
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5aa54] text-[#032419] font-black text-xs">2</span>
                  <p className="pt-0.5 leading-relaxed">{t('Tap Share icon in Safari')} (box with an upward arrow at the bottom toolbar).</p>
                </div>
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5aa54] text-[#032419] font-black text-xs">3</span>
                  <p className="pt-0.5 leading-relaxed">Scroll down and tap <strong>{t('Select "Add to Home Screen"')}</strong>, then tap <strong>{t('Tap "Add" in the top right')}</strong>.</p>
                </div>
              </div>
            )}

            {/* Desktop Guide */}
            {activeGuideTab === 'desktop' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5aa54] text-[#032419] font-black text-xs">1</span>
                  <p className="pt-0.5 leading-relaxed">Look at the right side of your browser address bar (URL bar).</p>
                </div>
                <div className="flex items-start gap-3 bg-white/5 p-3 rounded-xl border border-white/10">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f5aa54] text-[#032419] font-black text-xs">2</span>
                  <p className="pt-0.5 leading-relaxed">Click the <strong>Install</strong> or <strong>⊕</strong> icon in Chrome, Edge, or Brave.</p>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                className="w-full bg-[#f5aa54] text-[#032419] py-2.5 rounded-xl font-black text-xs"
              >
                {t('Done')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Team Passcode Modal */}
      {showPasscodeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-sm bg-[#042d1f] border border-white/20 rounded-2xl p-6 text-white shadow-2xl">
            <button
              type="button"
              onClick={() => { setShowPasscodeModal(false); setPasscodeError(false); }}
              className="absolute top-4 right-4 p-1 text-white/60 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center text-[#f5aa54]">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-black text-base">{t('Team access')}</h3>
            </div>

            <p className="text-xs text-white/70 mb-4">
              {t('Enter passcode to preview live app:')}
            </p>

            <form onSubmit={handlePasscodeSubmit} className="space-y-4">
              <input
                type="password"
                value={passcode}
                onChange={(e) => { setPasscode(e.target.value); setPasscodeError(false); }}
                placeholder="Passcode..."
                autoFocus
                className="w-full bg-black/30 border border-white/20 rounded-lg px-3 py-2 text-sm text-white placeholder-white/40 focus:outline-none focus:border-[#f5aa54]"
              />

              {passcodeError && (
                <p className="text-xs text-red-400 font-bold">
                  {t('Incorrect passcode')}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPasscodeModal(false)}
                  className="flex-1 py-2 text-xs font-bold text-white/70 hover:text-white"
                >
                  {t('Close')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-[#f5aa54] text-[#032419] py-2 rounded-lg font-black text-xs hover:bg-[#e09843]"
                >
                  {t('Unlock preview')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
