// src/state/store.tsx - Unified prototype store composed of modular state slices

import React, { createContext, useContext, useCallback, ReactNode } from 'react';
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
  setActiveOutletId: (id: string | null) => void;
  setSelectedMapOutletId: (id: string | null) => void;
  toggleProductCheck: (outletId: string, productId: string) => void;
  markUnpackingComplete: (outletId: string, complete?: boolean) => void;
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
