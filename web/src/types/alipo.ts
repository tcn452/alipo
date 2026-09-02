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
  distance_km?: number; // Optional client-side computed
}

export interface FuelReport {
  id: string;
  station: string;
  expand?: {
    station?: Station;
  };
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

export interface Company {
  id: string;
  name: string;
  type: 'logistics' | 'ngo' | 'delivery' | 'government' | 'other';
  billing_status: 'trial' | 'active' | 'overdue' | 'cancelled';
  plan: 'starter' | 'growth' | 'fleet';
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

export interface FuelAllocation {
  id: string;
  company: string;
  vehicle: string;
  expand?: {
    vehicle?: Vehicle;
  };
  period_start: string;
  period_end: string;
  allocated_litres: number;
  consumed_litres: number;
}

export interface RefuelEvent {
  id: string;
  vehicle: string;
  station?: string;
  expand?: {
    vehicle?: Vehicle;
    station?: Station;
  };
  litres: number;
  cost_mwk?: number;
  reported_by_phone?: string;
  odometer_km?: number;
  created: string;
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

export interface UserProfile {
  id: string;
  phone: string;
  name?: string;
  role: 'consumer' | 'station_attendant' | 'fleet_admin' | 'fleet_dispatcher' | 'fleet_driver' | 'wekode_ops';
  company?: string;
}
