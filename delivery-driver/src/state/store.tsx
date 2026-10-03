// src/state/store.tsx - Unified prototype store composed of modular state slices

import React, { createContext, useContext, useCallback, useEffect, ReactNode } from 'react';
import {
  ScreenName,
  TransitionType,
  RoutePlan,
  Outlet,
  DriverProfile,
  MeterPhotoRecord,
  RouteMeterPhotos,
  PrototypeConditions,
  NetworkStatus,
  GpsStatus,
  GpsQuality
} from '@/shared/types';
import { createInitialRoutes } from '@/shared/lib/mockData';
import {
  useNavigationSlice,
  getLogicalStackForScreen,
  getFallbackPrevScreen
} from './slices/navigationSlice';
import { useTrackingSlice } from './slices/trackingSlice';
import { useConditionsSlice, DEFAULT_CONDITIONS } from './slices/conditionsSlice';
import { useRoutesSlice } from './slices/routesSlice';
import { driverApi } from '@/api/driver';
import { queueLocation } from '@/offline/db';
import { flushSyncQueue } from '@/offline/syncQueue';

// Re-export domain types for backward compatibility
export type {
  ScreenName,
  MeterPhotoRecord,
  RouteMeterPhotos,
  TransitionType,
  NetworkStatus,
  GpsStatus,
  GpsQuality,
  PrototypeConditions
};
export { getLogicalStackForScreen, getFallbackPrevScreen };

export interface StoreContextType {
  // Navigation
  currentScreen: ScreenName;
  historyStack: ScreenName[];
  transitionType: TransitionType;
  returnTo: 'dashboard' | 'map';
  loginStage: 'stageA' | 'stageB';
  pushScreen: (screen: ScreenName) => void;
  popScreen: () => void;
  replaceScreen: (screen: ScreenName) => void;
  setReturnTo: (dest: 'dashboard' | 'map') => void;
  setLoginStage: (stage: 'stageA' | 'stageB') => void;

  // Toast
  toastMessage: string | null;
  showToast: (msg: string) => void;

  // Driver & Routes
  driver: DriverProfile;
  routes: RoutePlan[];
  selectedRouteId: number | null;
  expandedRouteId: number | null;
  activeOutletId: string | null;
  selectedMapOutletId: string | null;
  selectRoute: (id: number | null) => void;
  toggleExpandRoute: (id: number) => void;
  startRoute: (id: number) => void;
  finishRoute: (id: number) => void;
  setRouteVersion: (id: number, version: number) => void;
  setActiveOutletId: (id: string | null) => void;
  setSelectedMapOutletId: (id: string | null) => void;
  toggleProductCheck: (outletId: string, productId: string) => void;
  markUnpackingComplete: (outletId: string, complete?: boolean) => Promise<void>;
  completeOutlet: (outletId: string, isOffline?: boolean) => void;
  syncPendingOutlets: () => Promise<void>;
  isSyncing: boolean;

  // Meter Photos
  meterPhotos: Record<number, RouteMeterPhotos>;
  setRouteMeterPhoto: (routeId: number, moment: 'start' | 'end', record: MeterPhotoRecord) => void;
  clearRouteMeterPhotos: (routeId: number) => void;

  // Conditions (Panel controlled)
  conditions: PrototypeConditions;
  setConditions: React.Dispatch<React.SetStateAction<PrototypeConditions>>;
  updateCondition: <K extends keyof PrototypeConditions>(key: K, value: PrototypeConditions[K]) => void;

  // Store Manager Actions
  managerApprove: (outletId?: string) => void;
  managerReject: (outletId?: string, reason?: string) => void;
  issueNewPin: (outletId?: string) => void;
  expirePin: (outletId?: string) => void;

  // Selectors
  selectedRoute: RoutePlan | undefined;
  activeOutlet: Outlet | undefined;
  completedOutletsCount: number;
  totalOutletsCount: number;
  allOutletsCompleted: boolean;
  upNextOutlet: Outlet | null;

  // Function Tracker
  trackedFunctions: Record<string, boolean>;
  track: (id: string) => void;
  resetTicks: () => void;
  resetDemo: () => void;
  jumpToScreen: (screen: ScreenName) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const trackingSlice = useTrackingSlice();
  const navSlice = useNavigationSlice(trackingSlice.track);
  const conditionsSlice = useConditionsSlice(trackingSlice.track);
  const routesSlice = useRoutesSlice(trackingSlice.track, conditionsSlice.markMeterPhotosSynced);

  useEffect(() => {
    if (import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === 'true') return;
    void driverApi.routesToday().then(async (trips) => {
      const details = await Promise.all(trips.map((trip) => driverApi.tripDetail(trip._id)));
      routesSlice.setRoutes(details.map((trip, index) => ({
        apiId: trip._id,
        version: trip.version,
        vehicleId: trip.vehicleId,
        id: index + 1,
        routeNumber: index + 1,
        brandName: trip.tripNumber,
        distanceKm: trip.distanceKm,
        status: trip.status === 'in_transit' ? 'in_progress' : trip.status === 'completed' ? 'completed' : 'pending',
        outlets: trip.stops.map((stop) => {
          const order = trip.orders.find((candidate) => candidate._id === String((stop as unknown as { orderId?: string }).orderId)) ?? trip.orders.find((candidate) => candidate.outletId === stop.outletId);
          return {
            id: stop.stopId,
            city: stop.outletId,
            lat: 0,
            lng: 0,
            visitOrder: stop.sequence,
            managerName: 'Store Manager',
            managerPhone: '',
            itemCount: order?.items.length ?? 0,
            status: stop.status === 'completed' ? 'completed' : stop.status === 'arrived' ? 'in_progress' : 'pending',
            unpackingComplete: false,
            syncStatus: 'synced',
            products: (order?.items ?? []).map((item) => ({ id: item.sku, name: item.name, quantity: item.quantity, unit: item.unit, checked: false })),
            confirmation: { approvalStatus: 'waiting', attemptsLeft: 5, locked: false, expired: false },
          };
        }),
      })));
    }).catch((error) => {
      console.error('Driver route bootstrap list failed', error);
      routesSlice.setRoutes([]);
    });
  }, []);

  // Replay deliveries completed offline whenever the device is back online (and once on start).
  const { setRoutes } = routesSlice;
  useEffect(() => {
    if (import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === 'true') return;
    const replay = () => {
      if (!navigator.onLine) return;
      void flushSyncQueue().then(({ syncedStops }) => {
        if (!syncedStops.length) return;
        setRoutes((prev) => prev.map((route) => ({
          ...route,
          outlets: route.outlets.map((outlet) => syncedStops.some((stop) => stop.tripId === route.apiId && stop.stopId === outlet.id) ? { ...outlet, syncStatus: 'synced' } : outlet),
        })));
      });
    };
    replay();
    window.addEventListener('online', replay);
    return () => window.removeEventListener('online', replay);
  }, [setRoutes]);

  useEffect(() => {
    const activeTrip = routesSlice.routes.find((route) => route.status === 'in_progress' && route.apiId);
    if (!activeTrip?.apiId || !navigator.geolocation) return;
    let sequence = Date.now();
    const flush = () => { if (navigator.onLine) void driverApi.flushLocations(activeTrip.apiId!).catch((error) => console.error('Location upload failed', error)); };
    const watchId = navigator.geolocation.watchPosition((position) => {
      const point = {
        key: `${activeTrip.apiId}:${sequence}`,
        tripId: activeTrip.apiId!,
        sequence: sequence++,
        recordedAt: new Date(position.timestamp).toISOString(),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        ...(position.coords.heading == null ? {} : { heading: position.coords.heading }),
        ...(position.coords.speed == null ? {} : { speed: position.coords.speed }),
      };
      void queueLocation(point).then(flush);
    }, (error) => {
      console.error('Mandatory active-trip GPS gap', { code: error.code, message: error.message });
    }, { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 });
    window.addEventListener('online', flush);
    const interval = window.setInterval(flush, 30_000);
    return () => { navigator.geolocation.clearWatch(watchId); window.removeEventListener('online', flush); window.clearInterval(interval); };
  }, [routesSlice.routes]);

  const resetDemo = useCallback(() => {
    routesSlice.setRoutes(createInitialRoutes());
    routesSlice.setSelectedRouteId(null);
    routesSlice.setExpandedRouteId(null);
    routesSlice.setActiveOutletId(null);
    routesSlice.setSelectedMapOutletId(null);
    navSlice.setLoginStage('stageB');
    navSlice.setHistoryStack(['login']);
    navSlice.setTransitionType('replace');
    conditionsSlice.setConditions(DEFAULT_CONDITIONS);
    conditionsSlice.setMeterPhotos({});
    trackingSlice.setTrackedFunctions({ G01: true });
  }, [routesSlice, navSlice, conditionsSlice, trackingSlice]);

  const jumpToScreen = useCallback(
    (screen: ScreenName) => {
      navSlice.setTransitionType('replace');
      navSlice.setHistoryStack(getLogicalStackForScreen(screen));

      if (screen === 'login') {
        navSlice.setLoginStage('stageB');
        routesSlice.setSelectedRouteId(null);
      } else if (screen === 'meter_photo_start' || screen === 'dashboard') {
        routesSlice.setSelectedRouteId(1);
        navSlice.setLoginStage('stageB');
      } else if (screen === 'market_detail') {
        routesSlice.setSelectedRouteId(1);
        const r1 = routesSlice.routes[0];
        if (r1 && r1.outlets[0]) {
          routesSlice.setActiveOutletId(r1.outlets[0].id);
        }
      } else if (screen === 'pin_confirmation') {
        routesSlice.setSelectedRouteId(1);
        const r1 = routesSlice.routes[0];
        if (r1 && r1.outlets[0]) {
          routesSlice.setActiveOutletId(r1.outlets[0].id);
          routesSlice.setRoutes((prev) =>
            prev.map((r) => ({
              ...r,
              outlets: r.outlets.map((o, idx) => {
                if (idx === 0) {
                  return {
                    ...o,
                    unpackingComplete: true,
                    status: 'in_progress',
                    products: o.products.map((p) => ({ ...p, checked: true }))
                  };
                }
                return o;
              })
            }))
          );
        }
      } else if (screen === 'map') {
        routesSlice.setSelectedRouteId(2);
        routesSlice.setSelectedMapOutletId(null);
      } else if (screen === 'meter_photo_end') {
        routesSlice.setSelectedRouteId(2);
        routesSlice.setRoutes((prev) =>
          prev.map((r) => {
            if (r.id === 2 || r.routeNumber === 2) {
              return {
                ...r,
                status: 'in_progress',
                startedAt: '05:12',
                distanceKm: 42
              };
            }
            return r;
          })
        );
      } else if (screen === 'shift_summary') {
        routesSlice.setSelectedRouteId(2);
        routesSlice.setRoutes((prev) =>
          prev.map((r) => {
            if (r.id === 2 || r.routeNumber === 2) {
              return {
                ...r,
                status: 'completed',
                startedAt: '05:12',
                finishedAt: '11:48',
                distanceKm: 42,
                outlets: r.outlets.map((o) => ({
                  ...o,
                  status: 'completed',
                  syncStatus: o.city === 'Teldeniya' || o.city === 'Kundasale' ? 'pending' : 'synced'
                }))
              };
            }
            return r;
          })
        );
      }
    },
    [navSlice, routesSlice]
  );

  return (
    <StoreContext
      value={{
        ...navSlice,
        ...trackingSlice,
        ...conditionsSlice,
        ...routesSlice,
        resetDemo,
        jumpToScreen
      }}
    >
      {children}
    </StoreContext>
  );
};

export const useStore = (): StoreContextType => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
