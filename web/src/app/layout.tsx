import type { Metadata } from 'next';
import { Archivo_Black, DM_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { PwaRegistration } from '@/components/PwaRegistration';
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';
import { LanguageProvider } from '@/lib/i18n';
import { Analytics } from '@vercel/analytics/next';

const bodyFont = DM_Sans({ subsets: ['latin'], variable: '--font-body' });
const displayFont = Archivo_Black({ weight: '400', subsets: ['latin'], variable: '--font-display' });
const monoFont = IBM_Plex_Mono({ weight: ['500', '600'], subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Alipo — Malawi Fuel Availability Network',
  description: 'Real-time crowdsourced and station-verified fuel availability tracker for Lilongwe, Blantyre, Mzuzu and Malawi.',
  manifest: '/manifest.json',
  applicationName: 'Alipo',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Alipo' },
  icons: { icon: '/favicon.png', apple: '/apple-touch-icon.png' },
};

export const viewport = {
  themeColor: '#06452f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
      </head>
      <body className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} min-h-screen antialiased`}>
        <LanguageProvider>
          <PwaRegistration />
          <PwaInstallPrompt />
          {children}
        </LanguageProvider>
        <Analytics />
      </body>
    </html>
  );
}
