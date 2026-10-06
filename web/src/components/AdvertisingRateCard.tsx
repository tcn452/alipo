'use client';

import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, Mail, MessageCircle } from 'lucide-react';
import { Header } from '@/components/Header';
import { useLanguage } from '@/lib/i18n';
import { trackEvent } from '@/lib/gtag';

const placements = [
  { name: 'Station feed', description: 'An advertisement between station cards, with your business name, message and link.' },
  { name: 'App banner', description: 'A compact banner with your business name, a short message and a link.' },
  { name: 'After a report', description: 'An advertisement on the confirmation screen after someone submits a report.' },
];

export function AdvertisingRateCard() {
  const { t } = useLanguage();
  const contact = (method: 'email' | 'whatsapp') => trackEvent('advertising_enquiry', { method });
  return <><Header /><main className="min-h-screen bg-ivory text-ink">
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-12">
      <Link href="/" prefetch={false} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-forest underline underline-offset-4"><ArrowLeft className="h-4 w-4" />{t('Back to fuel stations')}</Link>
      <h1 className="mt-6 font-display text-4xl leading-tight tracking-[-.03em] text-forest sm:text-5xl">{t('Advertise on Alipo')}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">{t('Put your business in front of people checking fuel availability and queue times across Malawi.')}</p>
      <section aria-labelledby="rates-title" className="mt-10">
        <div className="flex flex-wrap items-baseline justify-between gap-3"><h2 id="rates-title" className="text-2xl font-black text-forest">{t('Advertising rate card')}</h2><span className="text-sm font-bold text-[#573780]">{t('Contact us for rates')}</span></div>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">{t('Tell us your preferred placement, target area and campaign dates. We will confirm pricing and availability before you book.')}</p>
        <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[520px] border-collapse text-left text-sm">
          <thead className="bg-[#573780] text-white"><tr><th scope="col" className="px-4 py-3">{t('Placement')}</th><th scope="col" className="px-4 py-3">{t('What appears')}</th><th scope="col" className="px-4 py-3">{t('Rate')}</th></tr></thead>
          <tbody>{placements.map((placement) => <tr key={placement.name} className="border-b border-[#d8cde6] even:bg-[#f4effa]"><th scope="row" className="px-4 py-5 font-bold text-forest">{t(placement.name)}</th><td className="max-w-md px-4 py-5 leading-6">{t(placement.description)}</td><td className="px-4 py-5 font-bold text-[#573780]">{t('On request')}</td></tr>)}</tbody>
        </table></div>
      </section>
      <section aria-labelledby="enquiry-title" className="mt-10 border-t border-line pt-8">
        <h2 id="enquiry-title" className="text-2xl font-black text-forest">{t('Plan your campaign')}</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{t('Send your business name, preferred placement, target area, campaign dates and the link you want customers to open.')}</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href="https://wa.me/27686021556?text=Hi%20WeKode%2C%20I%27d%20like%20advertising%20rates%20for%20Alipo.%20My%20business%20is%20" target="_blank" rel="noopener noreferrer" onClick={() => contact('whatsapp')} className="inline-flex min-h-11 items-center gap-2 bg-[#573780] px-4 py-3 text-sm font-bold text-white hover:bg-[#432765] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#573780]"><MessageCircle className="h-4 w-4" />{t('Ask for rates on WhatsApp')}<ArrowUpRight className="h-4 w-4" /></a>
          <a href="mailto:info@wekode.dev?subject=Alipo%20advertising%20enquiry" onClick={() => contact('email')} className="inline-flex min-h-11 items-center gap-2 border border-[#573780] px-4 py-3 text-sm font-bold text-[#573780] hover:bg-[#f4effa] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#573780]"><Mail className="h-4 w-4" />info@wekode.dev</a>
        </div>
      </section>
    </div>
  </main></>;
}
