export type FuelStatus = 'available' | 'low' | 'out' | 'unknown';
export type QueueEstimate = 'none' | 'short' | 'medium' | 'long';
export type FuelType = 'petrol' | 'diesel' | 'both';
export type ReportSource = 'ussd' | 'whatsapp' | 'web' | 'verified_station';

export interface Station {
  id: string;
  name: string;
  brand: string;
  latitude: number;
  longitude: number;
  district: string;
  city: 'Lilongwe' | 'Blantyre' | 'Mzuzu' | 'Zomba' | string;
  verified: boolean;
  fuel_types: ('petrol' | 'diesel')[];
  contact_phone?: string;
  latest_status?: FuelStatus;
  latest_queue?: QueueEstimate;
  latest_price_petrol?: number;
  latest_price_diesel?: number;
  last_reported_at?: string;
  created?: string;
  updated?: string;
  distance_km?: number;
}

export interface FuelReport {
  id: string;
  station: string;
  status: FuelStatus;
  fuel_type: FuelType;
  queue_estimate?: QueueEstimate;
  price?: number;
  source: ReportSource;
  reporter_phone?: string;
  confirmations?: number;
  is_active?: boolean;
  created: string;
}

export interface Vehicle {
  id: string;
  company: string;
  plate: string;
  assigned_driver_name?: string;
  assigned_driver_phone?: string;
  fuel_card_id?: string;
  fuel_type: 'petrol' | 'diesel';
  tank_capacity_litres?: number;
}

export interface DispatchRecommendation {
  id: string;
  name: string;
  brand: string;
  city: string;
  district: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  status: FuelStatus;
  queue: QueueEstimate;
  verified: boolean;
  price_petrol?: number;
  price_diesel?: number;
  score: number;
}
