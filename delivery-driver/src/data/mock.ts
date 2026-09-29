// app/src/data/mock.ts - Pure in-memory data models for WayLink prototype

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

export const CANONICAL_DRIVER: DriverProfile = {
  driverId: '8821',
  name: 'Marcus Vance',
  vehicleType: 'Isuzu ELF',
  plateNumber: 'LK-4821'
};

export const LOGIN_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_LOGIN_URL) ||
  'https://kraken-login-a.vercel.app/';

export const DEFAULT_PRODUCTS_LIST: OutletProduct[] = [
  { id: 'p-1', name: 'Fresh vegetables', quantity: 12, unit: 'cases', checked: false },
  { id: 'p-2', name: 'Dairy', quantity: 8, unit: 'cases', chilled: true, checked: false },
  { id: 'p-3', name: 'Bakery bread', quantity: 6, unit: 'trays', checked: false },
  { id: 'p-4', name: 'Cotton t-shirts', quantity: 4, unit: 'boxes', checked: false },
  { id: 'p-5', name: 'Denim jeans', quantity: 5, unit: 'boxes', checked: false },
  { id: 'p-6', name: 'Wireless earbuds', quantity: 3, unit: 'boxes', checked: false },
  { id: 'p-7', name: 'LED television 43"', quantity: 2, unit: 'units', checked: false }
];

export const createInitialRoutes = (): RoutePlan[] => {
  const route1Cities = [
    'Matale', 'Rattota', 'Ukuwela', 'Palapathwela', 'Galewela', 'Dambulla',
    'Naula', 'Wahacotte', 'Yatawatta', 'Pallepola', 'Kawudupelella', 'Aluvihare'
  ];

  const route2Cities = [
    'Kandy', 'Peradeniya', 'Gampola', 'Katugastota', 'Kadugannawa', 'Nawalapitiya',
    'Pilimatalawa', 'Ampitiya', 'Digana', 'Akurana', 'Wattegama', 'Teldeniya',
    'Kundasale', 'Mawanella'
  ];

  const route3Cities = [
    'Hatton', 'Nuwara Eliya', 'Talawakele', 'Kotagala', 'Maskeliya',
    'Bogawantalawa', 'Nanu Oya', 'Ragala', 'Walapane', 'Hanguranketha',
    'Rikillagaskada', 'Pundaluoya', 'Ginigathhena', 'Norton Bridge', 'Norwood',
    'Agarapathana', 'Dayagama', 'Rozella', 'Watawala', 'Kotmale'
  ];

  const makeOutlets = (cities: string[], routeNum: number): Outlet[] => {
    return cities.map((city, idx) => ({
      id: `out-r${routeNum}-${idx + 1}`,
      city,
      lat: 7.29 + (idx % 4) * 0.05 - 0.1,
      lng: 80.63 + Math.floor(idx / 4) * 0.05 - 0.1,
      visitOrder: idx + 1,
      managerName: 'Nuwan Perera',
      managerPhone: '077 123 4567',
      itemCount: 7 + (idx % 5),
      status: 'pending',
      unpackingComplete: false,
      syncStatus: 'synced',
      products: DEFAULT_PRODUCTS_LIST.map((p, pIdx) => ({
        ...p,
        id: `p-${idx + 1}-${pIdx + 1}`
      })),
      confirmation: {
        approvalStatus: 'waiting',
        attemptsLeft: 3,
        locked: false,
        expired: false
      }
    }));
  };

  return [
    {
      id: 1,
      routeNumber: 1,
      brandName: 'Waypoint',
      distanceKm: 38,
      status: 'pending',
      outlets: makeOutlets(route1Cities, 1)
    },
    {
      id: 2,
      routeNumber: 2,
      brandName: 'Waypoint',
      distanceKm: 42,
      status: 'pending',
      outlets: makeOutlets(route2Cities, 2)
    },
    {
      id: 3,
      routeNumber: 3,
      brandName: 'Waypoint',
      distanceKm: 48,
      status: 'pending',
      outlets: makeOutlets(route3Cities, 3)
    }
  ];
};
