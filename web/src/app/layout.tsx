import type { Metadata } from 'next';
import { Archivo_Black, DM_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const bodyFont = DM_Sans({ subsets: ['latin'], variable: '--font-body' });
const displayFont = Archivo_Black({ weight: '400', subsets: ['latin'], variable: '--font-display' });
const monoFont = IBM_Plex_Mono({ weight: ['500', '600'], subsets: ['latin'], variable: '--font-mono' });

export const metadata: Metadata = {
  title: 'Alipo — Malawi Fuel Availability Network',
  description: 'Real-time crowdsourced and station-verified fuel availability tracker for Lilongwe, Blantyre, Mzuzu and Malawi.',
  manifest: '/manifest.json',
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
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className={`${bodyFont.variable} ${displayFont.variable} ${monoFont.variable} min-h-screen antialiased`}>
        {children}
      </body>
    </html>
  );
}
