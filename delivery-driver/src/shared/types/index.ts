// src/shared/types/index.ts - Core domain models and state types

export interface OutletProduct {
  id: string;
  name: string;
  quantity: number | string;
  unit: string;
  chilled?: boolean;
  checked: boolean;
}

export interface OutletConfirmation {
  approvalStatus: 'waiting' | 'approved' | 'rejected';
  attemptsLeft: number;
  locked: boolean;
  expired: boolean;
  rejectionReason?: string;
}

export interface Outlet {
  apiVersion?: number;
  id: string;
  city: string;
  lat: number;
  lng: number;
  visitOrder: number;
  managerName: string;
  managerPhone: string;
  itemCount: number;
  status: 'pending' | 'in_progress' | 'completed';
  unpackingComplete: boolean;
  completedAt?: string;
  syncStatus: 'synced' | 'pending';
  products: OutletProduct[];
  confirmation: OutletConfirmation;
}

export interface RoutePlan {
  apiId?: string;
  version?: number;
  vehicleId?: string;
  id: number;
  routeNumber: number;
  brandName: string;
  distanceKm: number;
  status: 'pending' | 'in_progress' | 'completed';
  startedAt?: string;
  finishedAt?: string;
  outlets: Outlet[];
}

export interface DriverProfile {
  driverId: string;
  name: string;
  vehicleType: string;
  plateNumber: string;
}

export type ScreenName =
  | 'login'
  | 'meter_photo_start'
  | 'dashboard'
  | 'market_detail'
  | 'pin_confirmation'
  | 'meter_photo_end'
  | 'map'
  | 'shift_summary';

export interface MeterPhotoRecord {
  fileAssetId?: string;
  photoUri: string;
  capturedAt: string;
  rawFile?: File;
  syncStatus: 'synced' | 'pending';
}

export interface RouteMeterPhotos {
  start?: MeterPhotoRecord;
  end?: MeterPhotoRecord;
}

export type TransitionType = 'push' | 'pop' | 'replace';

export type NetworkStatus = 'good' | 'fair' | 'weak' | 'offline';
export type GpsStatus = 'on' | 'off' | 'requesting' | 'blocked' | 'unavailable';
export type GpsQuality = 'strong' | 'fair' | 'weak' | 'searching';

export interface PrototypeConditions {
  networkStatus: NetworkStatus;
  gpsStatus: GpsStatus;
  gpsQuality: GpsQuality;
  driverNearNextOutlet: boolean;
  nextPinResult: 'normal' | 'offline-saved';
}
