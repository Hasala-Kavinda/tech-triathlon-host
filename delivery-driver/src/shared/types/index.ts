// src/shared/types/index.ts - Core domain models and state types

/** How a stop can end. refused and closed end it unsuccessfully (the order becomes delivery_failed). */
export type StopOutcome = 'delivered' | 'partial' | 'refused' | 'closed' | 'failed';

export interface OutletProduct {
  /** The product SKU. */
  id: string;
  name: string;
  /** The quantity to deliver at this stop (from the delivery record once loaded). */
  quantity: number | string;
  unit: string;
  chilled?: boolean;
  checked: boolean;
  /** Reported at the stop; delivered = quantity - short - damaged. */
  short?: number;
  damaged?: number;
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
  tripStopId?: string;
  /** The Driver has told the server (or the offline queue) that they arrived. */
  arrived?: boolean;
  arrivedAt?: string;
  outcome?: StopOutcome;
  timingResult?: 'on_time' | 'late';
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
  /** The Driver has claimed the assignment and confirmed the vehicle (both on the server). */
  claimed?: boolean;
  vehicleConfirmed?: boolean;
  startedAtIso?: string;
  finishedAtIso?: string;
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
  | 'shift_summary'
  | 'history';

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
  /** Real GPS tracking health while a trip is on the road. */
  trackingDegraded: boolean;
  trackingReason: string;
}
