import type { Metadata } from 'next';
import { AdvertisingRateCard } from '@/components/AdvertisingRateCard';

export const metadata: Metadata = {
  title: 'Advertise on Alipo · Advertising rate card',
  description: 'Explore advertising placements on Alipo and contact WeKode for campaign rates and availability.',
};

export default function AdvertisePage() {
  return <AdvertisingRateCard />;
}
