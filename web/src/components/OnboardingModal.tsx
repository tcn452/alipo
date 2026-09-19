'use client';

import { useState } from 'react';
import {
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  CircleAlert,
  Download,
  Globe,
  LocateFixed,
  MapPin,
  Share,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { useLanguage } from '@/lib/i18n';
import { usePwaInstall } from '@/lib/usePwaInstall';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAllowLocation: () => void;
  isLocationActive: boolean;
  onEnableAlerts: () => void | Promise<void>;
  alertsEnabled: boolean;
  notificationState: 'unsupported' | 'denied' | 'ready';
}

export function OnboardingModal({
  isOpen,
  onClose,
  onAllowLocation,
  isLocationActive,
  onEnableAlerts,
  alertsEnabled,
  notificationState,
}: OnboardingModalProps) {
  const { language, setLanguage, t } = useLanguage();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [alertsBusy, setAlertsBusy] = useState(false);
  const { installEvent, isIos, isStandalone, install } = usePwaInstall({
    autoShowBanner: false,
  });

  if (!isOpen) return null;

  const handleFinish = () => {
    try {
      localStorage.setItem('alipo-onboarded', 'true');
    } catch {
      // Ignore storage restrictions
    }
    onClose();
  };

  const handleEnableAlerts = async () => {
    setAlertsBusy(true);
    try {
      await onEnableAlerts();
    } finally {
      setAlertsBusy(false);
    }
  };

  const showInstall = !isStandalone;
  const showAlerts = notificationState !== 'unsupported';

  return (
    <div
      className="fixed inset-0 z-[2500] flex items-center justify-center overflow-y-auto bg-[#032e20]/80 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
    >
      <div className="relative w-full max-w-md border border-white/20 bg-[#fbf8f1] shadow-[0_30px_100px_rgba(0,0,0,.4)] animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-line bg-forest px-5 py-4 text-white">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#f5aa54] text-[11px] font-black text-forest">
              {step}
            </span>
            <span className="text-xs font-bold text-white/70">
              {t('Step {current} of {total}', { current: step, total: 3 })}
            </span>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            className="text-xs font-bold text-white/70 underline underline-offset-2 hover:text-white"
          >
            {t('Skip')}
          </button>
        </div>

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#dfead7] text-forest">
                  <Globe className="h-6 w-6" />
                </div>
                <h2 id="onboarding-title" className="mt-3 text-2xl font-black tracking-[-0.03em] text-ink">
                  {t('Choose your language')}
                </h2>
                <p className="mt-1 text-xs text-muted">
                  {language === 'ny'
                    ? 'Sankhani chilankhulo chomwe mukufuna kugwiritsa ntchito pa Alipo.'
                    : 'Choose your preferred language for using Alipo.'}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setLanguage('ny')}
                  className={`flex flex-col items-center justify-center border-2 p-4 text-center transition ${
                    language === 'ny'
                      ? 'border-forest bg-[#e5eddc] shadow-sm'
                      : 'border-line bg-white hover:border-[#97a491]'
                  }`}
                >
                  <span className="text-2xl">🇲🇼</span>
                  <strong className="mt-2 text-sm font-black text-ink">Chichewa</strong>
                  <span className="mt-0.5 text-[10px] text-muted">Chilankhulo cha m’Malawi</span>
                  {language === 'ny' && (
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-forest">
                      <Check className="h-3.5 w-3.5" /> Chosankhidwa
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setLanguage('en')}
                  className={`flex flex-col items-center justify-center border-2 p-4 text-center transition ${
                    language === 'en'
                      ? 'border-forest bg-[#e5eddc] shadow-sm'
                      : 'border-line bg-white hover:border-[#97a491]'
                  }`}
                >
                  <span className="text-2xl">🇬🇧</span>
                  <strong className="mt-2 text-sm font-black text-ink">English</strong>
                  <span className="mt-0.5 text-[10px] text-muted">English Language</span>
                  {language === 'en' && (
                    <span className="mt-2 inline-flex items-center gap-1 text-[10px] font-black text-forest">
                      <Check className="h-3.5 w-3.5" /> Selected
                    </span>
                  )}
                </button>
              </div>

              <button
                type="button"
                onClick={() => setStep(2)}
                className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 bg-forest text-sm font-black text-white transition hover:bg-[#0b5940]"
              >
                {t('Next')} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#dfead7] text-forest">
                  <MapPin className="h-6 w-6" />
                </div>
                <h2 id="onboarding-title" className="mt-3 text-2xl font-black tracking-[-0.03em] text-ink">
                  {t('Find fuel near you')}
                </h2>
                <p className="mt-1.5 text-xs leading-5 text-muted">
                  {t('Allow location to see the closest petrol and diesel stations in Malawi.')}
                </p>
              </div>

              <div className="rounded-lg border border-[#c4d6bc] bg-[#eff5eb] p-4 text-center">
                {isLocationActive ? (
                  <div className="flex flex-col items-center gap-1 text-forest">
                    <CheckCircle2 className="h-8 w-8 text-[#398151]" />
                    <strong className="text-sm font-black">{t('Location enabled')}</strong>
                    <p className="text-[11px] text-muted">{t('Near your location')}</p>
                  </div>
                ) : (
                  <div>
                    <button
                      type="button"
                      onPointerUp={(event) => {
                        if (event.pointerType === 'mouse' && event.button !== 0) return;
                        onAllowLocation();
                      }}
                      onClick={(event) => {
                        if (event.detail === 0) onAllowLocation();
                      }}
                      className="inline-flex h-11 items-center justify-center gap-2 border-2 border-forest bg-forest px-5 text-xs font-black text-white transition hover:bg-[#0b5940]"
                    >
                      <LocateFixed className="h-4 w-4 text-[#f5aa54]" />
                      {t('Allow location')}
                    </button>
                    <p className="mt-2 text-[10px] text-muted">
                      {t('Converted to a private fingerprint before storage.')}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="inline-flex h-12 items-center justify-center border border-line bg-white px-4 text-xs font-bold text-muted hover:text-ink"
                >
                  {t('Back')}
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 bg-forest text-sm font-black text-white transition hover:bg-[#0b5940]"
                >
                  {t('Next')} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#fef3e3] text-orange">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h2 id="onboarding-title" className="mt-3 text-2xl font-black tracking-[-0.03em] text-ink">
                  {t('How to read fuel reports')}
                </h2>
                <p className="mt-1 text-xs text-muted">{t('Check before you drive')}</p>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-3 border border-line bg-white p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#dfead7] text-[#2e6d42]">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div>
                    <strong className="block text-ink">{t('Green: Fuel is available')}</strong>
                    <span className="text-[10px] text-muted">{t('Fuel available')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 border border-line bg-white p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#fef3e3] text-[#cf8019]">
                    <CircleAlert className="h-4 w-4" />
                  </span>
                  <div>
                    <strong className="block text-ink">{t('Orange: Running low or long queue')}</strong>
                    <span className="text-[10px] text-muted">{t('Running low')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3 border border-line bg-white p-3">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#fceae6] text-[#b9381e]">
                    <XCircle className="h-4 w-4" />
                  </span>
                  <div>
                    <strong className="block text-ink">{t('Red: Pumps are dry')}</strong>
                    <span className="text-[10px] text-muted">{t('No fuel')}</span>
                  </div>
                </div>
              </div>

              {(showInstall || showAlerts) && (
                <div className="space-y-2 border border-dashed border-forest/30 bg-[#eff5eb] p-3">
                  <strong className="block text-sm font-black text-forest">{t('Stay ready on your phone')}</strong>
                  <p className="text-[11px] leading-4 text-muted">
                    {t('Install Alipo and turn on station alerts so you can check fuel and help nearby drivers.')}
                  </p>

                  {showInstall && (
                    <div className="pt-1">
                      {installEvent ? (
                        <button
                          type="button"
                          onClick={() => {
                            void install();
                          }}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 bg-orange text-xs font-black text-white transition hover:bg-[#d95a1c]"
                        >
                          <Download className="h-4 w-4" />
                          {t('Install app')}
                        </button>
                      ) : isIos ? (
                        <p className="flex items-start gap-2 border border-forest/20 bg-white px-3 py-2.5 text-[11px] font-bold text-ink">
                          <Share className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
                          {t('Tap Share, then “Add to Home Screen”.')}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="flex items-start gap-2 border border-forest/20 bg-white px-3 py-2.5 text-[11px] font-bold text-ink">
                            <Download className="mt-0.5 h-4 w-4 shrink-0 text-orange" />
                            {t('Use your browser menu to install Alipo when the option appears.')}
                          </p>
                          <p className="px-1 text-[10px] leading-4 text-muted">
                            {t('On Chrome or Edge, open the browser menu and choose Install app or Add to Home screen.')}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {isStandalone && (
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-forest">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {t('Alipo is installed on this device')}
                    </p>
                  )}

                  {showAlerts && (
                    <div className="pt-1">
                      {alertsEnabled ? (
                        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-forest">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {t('Station alerts enabled')}
                        </p>
                      ) : notificationState === 'denied' ? (
                        <p className="text-[11px] font-bold text-[#9d321d]">
                          {t('Notifications are blocked. Enable them in your browser settings to use station alerts.')}
                        </p>
                      ) : (
                        <button
                          type="button"
                          disabled={alertsBusy}
                          onClick={() => {
                            void handleEnableAlerts();
                          }}
                          className="inline-flex h-11 w-full items-center justify-center gap-2 border-2 border-forest bg-white text-xs font-black text-forest transition hover:bg-[#e5eddc] disabled:opacity-60"
                        >
                          <Bell className="h-4 w-4" />
                          {t('Enable station alerts')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="inline-flex h-12 items-center justify-center border border-line bg-white px-4 text-xs font-bold text-muted hover:text-ink"
                >
                  {t('Back')}
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="inline-flex h-12 flex-1 items-center justify-center gap-2 bg-forest text-sm font-black text-white shadow-sm transition hover:bg-[#0b5940]"
                >
                  {t('Start finding fuel')} <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
