import { Outlet, RoutePlan, OutletProduct } from '../state/routeContext';
import { SyncQueueItem } from '../state/syncQueueContext';

export interface DriverProfile {
  driverId: string;
  name: string;
  vehicleType: string;
  plateNumber: string;
}

export const CANONICAL_DRIVER: DriverProfile = {
  driverId: 'FL-8821',
  name: 'Marcus Vance',
  vehicleType: 'Isuzu ELF',
  plateNumber: 'LK-4821'
};

export const DEFAULT_PRODUCTS_LIST: OutletProduct[] = [
  { id: 'p-1', name: 'Fresh vegetables', quantity: 12, unit: 'cases', checked: false },
  { id: 'p-2', name: 'Dairy', quantity: 8, unit: 'cases', chilled: true, checked: false },
  { id: 'p-3', name: 'Bakery bread', quantity: 6, unit: 'trays', checked: false },
  { id: 'p-4', name: 'Cotton t-shirts', quantity: 4, unit: 'boxes', checked: false },
  { id: 'p-5', name: 'Denim jeans', quantity: 5, unit: 'boxes', checked: false },
  { id: 'p-6', name: 'Wireless earbuds', quantity: 3, unit: 'boxes', checked: false },
  { id: 'p-7', name: 'LED television 43"', quantity: 2, unit: 'units', checked: false }
];

const generateProductsForOutlet = (count: number): OutletProduct[] => {
  const pool = [
    { name: 'Fresh vegetables', unit: 'cases', chilled: false },
    { name: 'Dairy', unit: 'cases', chilled: true },
    { name: 'Bakery bread', unit: 'trays', chilled: false },
    { name: 'Cotton t-shirts', unit: 'boxes', chilled: false },
    { name: 'Denim jeans', unit: 'boxes', chilled: false },
    { name: 'Wireless earbuds', unit: 'boxes', chilled: false },
    { name: 'LED television 43"', unit: 'units', chilled: false },
    { name: 'Fruit crates', unit: 'cases', chilled: false },
    { name: 'Chilled Yogurt', unit: 'cases', chilled: true },
    { name: 'Rice bags', unit: 'bags', chilled: false },
    { name: 'Sports shoes', unit: 'boxes', chilled: false },
    { name: 'School bags', unit: 'boxes', chilled: false },
    { name: 'Bluetooth speakers', unit: 'boxes', chilled: false },
    { name: 'Power banks', unit: 'boxes', chilled: false }
  ];
  return Array.from({ length: count }, (_, i) => {
    const item = pool[i % pool.length];
    return {
      id: `p-${i + 1}`,
      name: item.name,
      quantity: Math.floor(Math.random() * 8) + 2,
      unit: item.unit,
      chilled: item.chilled,
      checked: false
    };
  });
};

// Route 2 Outlets (14 outlets, 42 km) - Central Province
const ROUTE_2_OUTLETS: Outlet[] = [
  {
    id: 'out-r2-1',
    city: 'Kandy',
    lat: 7.2906,
    lng: 80.6337,
    visitOrder: 1,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 7,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: DEFAULT_PRODUCTS_LIST.map((p) => ({ ...p }))
  },
  {
    id: 'out-r2-2',
    city: 'Peradeniya',
    lat: 7.2605,
    lng: 80.5975,
    visitOrder: 2,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 10,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(10)
  },
  {
    id: 'out-r2-3',
    city: 'Gampola',
    lat: 7.1643,
    lng: 80.5694,
    visitOrder: 3,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 11,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(11)
  },
  {
    id: 'out-r2-4',
    city: 'Katugastota',
    lat: 7.3300,
    lng: 80.6200,
    visitOrder: 4,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 8,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(8)
  },
  {
    id: 'out-r2-5',
    city: 'Kadugannawa',
    lat: 7.2539,
    lng: 80.5208,
    visitOrder: 5,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 9,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(9)
  },
  {
    id: 'out-r2-6',
    city: 'Nawalapitiya',
    lat: 7.0500,
    lng: 80.5333,
    visitOrder: 6,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 12,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(12)
  },
  {
    id: 'out-r2-7',
    city: 'Pilimatalawa',
    lat: 7.2650,
    lng: 80.5500,
    visitOrder: 7,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 7,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(7)
  },
  {
    id: 'out-r2-8',
    city: 'Ampitiya',
    lat: 7.2800,
    lng: 80.6550,
    visitOrder: 8,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 9,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(9)
  },
  {
    id: 'out-r2-9',
    city: 'Digana',
    lat: 7.3000,
    lng: 80.7300,
    visitOrder: 9,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 8,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(8)
  },
  {
    id: 'out-r2-10',
    city: 'Akurana',
    lat: 7.3600,
    lng: 80.6200,
    visitOrder: 10,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 10,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(10)
  },
  {
    id: 'out-r2-11',
    city: 'Wattegama',
    lat: 7.3500,
    lng: 80.6800,
    visitOrder: 11,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 6,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(6)
  },
  {
    id: 'out-r2-12',
    city: 'Teldeniya',
    lat: 7.3000,
    lng: 80.7600,
    visitOrder: 12,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 8,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(8)
  },
  {
    id: 'out-r2-13',
    city: 'Kundasale',
    lat: 7.2800,
    lng: 80.6800,
    visitOrder: 13,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 7,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(7)
  },
  {
    id: 'out-r2-14',
    city: 'Mawanella',
    lat: 7.2500,
    lng: 80.4500,
    visitOrder: 14,
    managerName: 'Nuwan Perera',
    managerPhone: '077 123 4567',
    itemCount: 7,
    status: 'pending',
    unpackingComplete: false,
    syncStatus: 'synced',
    confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false },
    products: generateProductsForOutlet(7)
  }
];

// Route 1 Outlets (12 outlets, 38 km)
const ROUTE_1_OUTLETS: Outlet[] = [
  'Matale', 'Rattota', 'Ukuwela', 'Palapathwela', 'Galewela', 'Dambulla',
  'Naula', 'Wahacotte', 'Yatawatta', 'Pallepola', 'Kawudupelella', 'Aluvihare'
].map((city, idx) => ({
  id: `out-r1-${idx + 1}`,
  city,
  lat: 7.4675 + (idx * 0.02) - 0.1,
  lng: 80.6234 + (idx * 0.015) - 0.08,
  visitOrder: idx + 1,
  managerName: 'Nuwan Perera',
  managerPhone: '077 123 4567',
  itemCount: 8,
  status: 'pending' as const,
  unpackingComplete: false,
  syncStatus: 'synced' as const,
  confirmation: { approvalStatus: 'waiting' as const, attemptsLeft: 3, locked: false, expired: false },
  products: generateProductsForOutlet(8)
}));

// Route 3 Outlets (20 outlets, 48 km)
const ROUTE_3_OUTLETS: Outlet[] = [
  'Hatton', 'Nuwara Eliya', 'Talawakele', 'Kotagala', 'Maskeliya',
  'Bogawantalawa', 'Nanu Oya', 'Ragala', 'Walapane', 'Hanguranketha',
  'Rikillagaskada', 'Pundaluoya', 'Ginigathhena', 'Norton Bridge', 'Norwood',
  'Agarapathana', 'Dayagama', 'Rozella', 'Watawala', 'Kotmale'
].map((city, idx) => ({
  id: `out-r3-${idx + 1}`,
  city,
  lat: 6.9500 + (idx * 0.02) - 0.1,
  lng: 80.6000 + (idx * 0.015) - 0.08,
  visitOrder: idx + 1,
  managerName: 'Nuwan Perera',
  managerPhone: '077 123 4567',
  itemCount: 9,
  status: 'pending' as const,
  unpackingComplete: false,
  syncStatus: 'synced' as const,
  confirmation: { approvalStatus: 'waiting' as const, attemptsLeft: 3, locked: false, expired: false },
  products: generateProductsForOutlet(9)
}));

export const INITIAL_ROUTES: RoutePlan[] = [
  {
    id: 1,
    routeNumber: 1,
    brandName: 'Waypoint',
    distanceKm: 38,
    status: 'pending',
    outlets: ROUTE_1_OUTLETS
  },
  {
    id: 2,
    routeNumber: 2,
    brandName: 'Waypoint',
    distanceKm: 42,
    status: 'pending',
    outlets: ROUTE_2_OUTLETS
  },
  {
    id: 3,
    routeNumber: 3,
    brandName: 'Waypoint',
    distanceKm: 48,
    status: 'pending',
    outlets: ROUTE_3_OUTLETS
  }
];

export interface VerifyPinResult {
  status: 'ok' | 'queued' | 'wrong' | 'locked' | 'expired' | 'rejected';
  attemptsLeft?: number;
  rejectionReason?: string;
}

export class MockApiService {
  private static latency(): Promise<void> {
    const delay = Math.floor(Math.random() * 500) + 300; // 300-800 ms
    return new Promise((resolve) => setTimeout(resolve, delay));
  }

  static async signIn(_phone: string, _otp: string): Promise<DriverProfile> {
    await this.latency();
    return CANONICAL_DRIVER;
  }

  static async getTodayRoutes(): Promise<RoutePlan[]> {
    await this.latency();
    return JSON.parse(JSON.stringify(INITIAL_ROUTES));
  }

  static async verifyPin(
    pin: string,
    currentAttemptsLeft: number,
    isOffline: boolean = false
  ): Promise<VerifyPinResult> {
    await this.latency();

    // Check dev toggle overrides
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      if (search.get('dev') === 'rejected' || search.get('state') === 'rejected') {
        return {
          status: 'rejected',
          rejectionReason: 'Damaged packaging on chilled goods. Reschedule for morning batch.'
        };
      }
      if (search.get('dev') === 'locked' || search.get('state') === 'locked') {
        return { status: 'locked' };
      }
      if (search.get('dev') === 'expired' || search.get('state') === 'expired') {
        return { status: 'expired' };
      }
      if (search.get('dev') === 'offline' || isOffline || !navigator.onLine) {
        return { status: 'queued' };
      }
    }

    if (isOffline || !navigator.onLine) {
      return { status: 'queued' };
    }

    // Canonical correct PIN is 4821
    if (pin === '4821') {
      return { status: 'ok' };
    }

    const nextAttempts = currentAttemptsLeft - 1;
    if (nextAttempts <= 0) {
      return { status: 'locked', attemptsLeft: 0 };
    }

    return { status: 'wrong', attemptsLeft: nextAttempts };
  }

  static async flushQueueItem(item: SyncQueueItem): Promise<{ success: boolean }> {
    await new Promise((resolve) => setTimeout(resolve, 600)); // 600 ms simulated server processing
    // In dev offline mode, fail flush
    if (typeof window !== 'undefined') {
      const search = new URLSearchParams(window.location.search);
      if (search.get('dev') === 'offline' || !navigator.onLine) {
        return { success: false };
      }
    }
    return { success: true };
  }
}
