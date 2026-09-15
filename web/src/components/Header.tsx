'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Languages, LayoutDashboard, Plus, Radio, Smartphone } from 'lucide-react';
import { useLanguage } from '@/lib/i18n';

interface HeaderProps { onOpenReport?: () => void; }

export function Header({ onOpenReport }: HeaderProps) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <header className="sticky top-0 z-30 h-[72px] border-b border-line bg-[#fbf8f1]/95 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1440px] items-center justify-between px-4 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-2 sm:gap-3" aria-label="Alipo home">
          <Image src="/alipo-mark.jpg" alt="Alipo" width={46} height={46} priority className="h-11 w-11 object-cover object-center" />
          <div><p className="text-xl font-black leading-none tracking-[-.04em] text-forest">Alipo</p><p className="mt-1 hidden text-[9px] font-black uppercase tracking-[.2em] text-orange sm:block">{t('Fuel is there')}</p></div>
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          <Link href="/" className="inline-flex items-center gap-2 text-xs font-black text-forest"><Radio className="h-4 w-4 text-orange" /> {t('Live map')}</Link>
          <span className="inline-flex items-center gap-2 text-xs font-bold text-muted"><Smartphone className="h-4 w-4" /> USSD <strong className="font-mono text-ink">*384*265#</strong></span>
          <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs font-bold text-ink transition hover:text-forest"><LayoutDashboard className="h-4 w-4" /> {t('Fleet portal')}</Link>
        </nav>

        <div className="flex items-center gap-2">
          <div className="flex h-10 items-center border border-line bg-white p-1" aria-label="Language"><Languages className="mx-1 h-3.5 w-3.5 text-muted" /><button type="button" onClick={() => setLanguage('en')} aria-pressed={language === 'en'} className={`h-7 px-2 text-[10px] font-black ${language === 'en' ? 'bg-forest text-white' : 'text-muted'}`}>EN</button><button type="button" onClick={() => setLanguage('ny')} aria-pressed={language === 'ny'} className={`h-7 px-2 text-[10px] font-black ${language === 'ny' ? 'bg-forest text-white' : 'text-muted'}`}>NY</button></div>
          {onOpenReport && <a href="#report-fuel" onClick={onOpenReport} className="inline-flex h-10 items-center gap-2 bg-orange px-3 text-xs font-black text-white transition hover:bg-[#d95a1c] sm:px-4"><Plus className="h-4 w-4" /><span className="sm:hidden">{t('Report')}</span><span className="hidden sm:inline">{t('Report fuel')}</span></a>}
        </div>
      </div>
    </header>
  );
}
