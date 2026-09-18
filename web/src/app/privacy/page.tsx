import Link from 'next/link';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — Alipo',
  description: 'Privacy Policy and cookie disclosures for the Alipo Malawi Fuel Availability Network.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#f8f5ee] text-ink">
      <header className="border-b border-line bg-forest px-5 py-6 text-white sm:px-8 lg:px-12">
        <div className="mx-auto flex max-w-4xl items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wider text-[#f5aa54] transition hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Alipo
          </Link>
          <span className="text-xs font-bold text-white/70">Legal & Transparency</span>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8 lg:py-16">
        <div className="border border-line bg-white p-6 sm:p-10 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#dfead7] text-forest">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-forest">
                Privacy & Data Protection
              </p>
              <h1 className="mt-0.5 text-2xl font-black tracking-[-0.03em] sm:text-3xl">
                Privacy Policy
              </h1>
            </div>
          </div>

          <p className="mt-6 text-xs text-muted">
            Last Updated: September 2026 · Effective Immediately
          </p>

          <hr className="my-6 border-line" />

          <div className="space-y-6 text-sm leading-relaxed text-ink/90">
            <section>
              <h2 className="text-base font-black text-ink">1. About Alipo</h2>
              <p className="mt-2 text-muted">
                Alipo is a crowdsourced civic utility platform designed to track real-time fuel availability across filling stations in Malawi. We respect your privacy and only process data strictly necessary to maintain verified station statuses and user safety.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black text-ink">2. Information We Collect</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-muted">
                <li>
                  <strong className="text-ink">Location Data:</strong> With your explicit browser permission, we use your device location to determine which nearby fuel stations to display or to verify station submissions. We do not store continuous GPS tracking traces.
                </li>
                <li>
                  <strong className="text-ink">Community Reports & Phone Numbers:</strong> When submitting fuel updates, name suggestions, or flags, phone numbers are converted to irreversible cryptographic hashes to prevent spam and duplicate voting while preserving your anonymity.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-black text-ink">3. Advertising & Google AdSense Disclosures</h2>
              <p className="mt-2 text-muted">
                To keep Alipo free and accessible to all Malawians, we display advertisements and sponsorships. We work with third-party vendors, including Google AdSense.
              </p>
              <ul className="mt-2 list-disc space-y-2 pl-5 text-muted">
                <li>
                  Third-party vendors, including Google, use cookies to serve ads based on your prior visits to our website or other websites on the internet.
                </li>
                <li>
                  Google’s use of advertising cookies enables it and its partners to serve ads to you based on your visits to our site and/or other sites on the internet.
                </li>
                <li>
                  You may opt out of personalized advertising by visiting{' '}
                  <a
                    href="https://www.google.com/settings/ads"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-forest underline hover:text-orange"
                  >
                    Google Ads Settings
                  </a>{' '}
                  or by visiting{' '}
                  <a
                    href="https://www.aboutads.info/choices/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-forest underline hover:text-orange"
                  >
                    aboutads.info
                  </a>.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-base font-black text-ink">4. Data Security</h2>
              <p className="mt-2 text-muted">
                All database records are hosted on secure, encrypted database clusters with strict row-level security (RLS) policies. We do not sell or rent personal user details to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-base font-black text-ink">5. Contact Us</h2>
              <p className="mt-2 text-muted">
                If you have questions regarding this policy or data practices, contact us at{' '}
                <a href="mailto:info@wekode.dev" className="font-bold text-forest underline">
                  info@wekode.dev
                </a>.
              </p>
            </section>
          </div>

          <div className="mt-10 border-t border-line pt-6">
            <Link
              href="/"
              className="inline-flex min-h-11 items-center gap-2 bg-forest px-6 text-xs font-black text-white transition hover:bg-[#0b5940]"
            >
              <ArrowLeft className="h-4 w-4" />
              Return to Alipo Fuel Map
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
