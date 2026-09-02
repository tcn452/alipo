import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Alipo — Malawi Fuel Availability Network',
  description: 'Real-time crowdsourced and station-verified fuel availability tracker for Lilongwe, Blantyre, Mzuzu and Malawi.',
  manifest: '/manifest.json',
};

export const viewport = {
  themeColor: '#059669',
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
      <body className="min-h-screen flex flex-col antialiased text-gray-900 bg-gray-50">
        {children}
      </body>
    </html>
  );
}
