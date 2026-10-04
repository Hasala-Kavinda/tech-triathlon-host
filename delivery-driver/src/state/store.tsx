// src/state/store.tsx - Unified prototype store composed of modular state slices

import React, { createContext, useContext, useCallback, useEffect, useRef, ReactNode } from 'react';
import {
  ScreenName,
  TransitionType,
  RoutePlan,
  Outlet,
  StopOutcome,
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
  setProductIssue: (outletId: string, productId: string, issue: { short: number; damaged: number }) => void;
  arriveAtOutlet: (outletId: string) => Promise<void>;
  claimRoute: (routeId: number) => Promise<void>;
  reloadRoutes: () => Promise<void>;
  refreshRoute: (routeId: number) => Promise<void>;
  routesStatus: 'loading' | 'ready' | 'error';
  routesError: string;
  whyOutletLocked: (outletId: string) => string | null;
  markUnpackingComplete: (outletId: string, complete?: boolean) => Promise<void>;
  completeOutlet: (outletId: string, isOffline?: boolean, outcome?: StopOutcome) => void;
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

  const { reloadRoutes, refreshRoute, setRoutes, routes } = routesSlice;
  const routesRef = useRef(routes);
  routesRef.current = routes;
  const { setConditions } = conditionsSlice;

  // Today's trips for the signed-in Driver, from the server.
  useEffect(() => {
    if (import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === 'true') return;
    void reloadRoutes();
  }, [reloadRoutes]);

  // Replay deliveries completed offline whenever the device is back online (and once on start).
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
        // Pick up the server's on-time/late result for the stops that just synced.
        for (const tripId of new Set(syncedStops.map((stop) => stop.tripId))) {
          const route = routesRef.current.find((candidate) => candidate.apiId === tripId);
          if (route) void refreshRoute(route.id).catch((error) => console.error('Route refresh failed', error));
        }
      });
    };
    replay();
    window.addEventListener('online', replay);
    return () => window.removeEventListener('online', replay);
  }, [setRoutes, refreshRoute]);

  // Mandatory GPS while a trip is on the road. The watch follows the active trip only (it is not
  // rebuilt on every state change). A denied permission, a failing GPS or a long gap without a fix
  // sets the "Tracking Degraded" state; the next fix clears it.
  const activeTripApiId = routes.find((route) => route.status === 'in_progress' && route.apiId)?.apiId;
  useEffect(() => {
    if (!activeTripApiId || !navigator.geolocation) return;
    const NO_FIX_LIMIT_MS = 60_000;
    let lastFixAt = Date.now();
    let sequence = Date.now();
    const degrade = (gpsStatus: 'blocked' | 'unavailable', reason: string) =>
      setConditions((prev) => (prev.trackingDegraded && prev.trackingReason === reason ? prev : { ...prev, gpsStatus, trackingDegraded: true, trackingReason: reason }));
    const flush = () => { if (navigator.onLine) void driverApi.flushLocations(activeTripApiId).catch((error) => console.error('Location upload failed', error)); };
    const watchId = navigator.geolocation.watchPosition((position) => {
      lastFixAt = Date.now();
      setConditions((prev) => (prev.trackingDegraded || prev.gpsStatus !== 'on' ? { ...prev, gpsStatus: 'on', trackingDegraded: false, trackingReason: '' } : prev));
      const point = {
        key: `${activeTripApiId}:${sequence}`,
        tripId: activeTripApiId,
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
      if (error.code === error.PERMISSION_DENIED) degrade('blocked', 'Location permission is denied. Turn it on to keep tracking.');
      else degrade('unavailable', 'No GPS fix. Move to open sky or check location settings.');
    }, { enableHighAccuracy: true, maximumAge: 5_000, timeout: 15_000 });
    const watchdog = window.setInterval(() => {
      if (Date.now() - lastFixAt > NO_FIX_LIMIT_MS) degrade('unavailable', 'No GPS fix for over a minute.');
    }, 10_000);
    window.addEventListener('online', flush);
    const interval = window.setInterval(flush, 30_000);
    return () => { navigator.geolocation.clearWatch(watchId); window.removeEventListener('online', flush); window.clearInterval(interval); window.clearInterval(watchdog); };
  }, [activeTripApiId, setConditions]);

  const resetDemo = useCallback(() => {
    // Live mode shows nothing but what the server has: reset to empty and read the routes again.
    if (import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === 'true') routesSlice.setRoutes(createInitialRoutes());
    else { routesSlice.setRoutes([]); void routesSlice.reloadRoutes(); }
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
