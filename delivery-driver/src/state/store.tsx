// app/src/state/store.ts - Unified in-memory prototype store with function tracker

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from 'react';
import { RoutePlan, Outlet, createInitialRoutes, CANONICAL_DRIVER, DriverProfile } from '../data/mock';

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

export const getLogicalStackForScreen = (screen: ScreenName): ScreenName[] => {
  switch (screen) {
    case 'login':
      return ['login'];
    case 'meter_photo_start':
      return ['login', 'meter_photo_start'];
    case 'dashboard':
      return ['login', 'dashboard'];
    case 'market_detail':
      return ['login', 'dashboard', 'market_detail'];
    case 'pin_confirmation':
      return ['login', 'dashboard', 'market_detail', 'pin_confirmation'];
    case 'meter_photo_end':
      return ['login', 'dashboard', 'meter_photo_end'];
    case 'map':
      return ['login', 'dashboard', 'map'];
    case 'shift_summary':
      return ['login', 'dashboard', 'shift_summary'];
    default:
      return ['login'];
  }
};

export const getFallbackPrevScreen = (current: ScreenName, returnTo: 'dashboard' | 'map'): ScreenName => {
  switch (current) {
    case 'map':
      return 'dashboard';
    case 'market_detail':
      return returnTo === 'map' ? 'map' : 'dashboard';
    case 'pin_confirmation':
      return returnTo === 'map' ? 'map' : 'market_detail';
    case 'meter_photo_start':
      return 'login';
    case 'meter_photo_end':
      return returnTo === 'map' ? 'map' : 'dashboard';
    case 'shift_summary':
      return 'dashboard';
    case 'dashboard':
      return 'login';
    case 'login':
    default:
      return 'login';
  }
};

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export const StoreProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Navigation
  const [historyStack, setHistoryStack] = useState<ScreenName[]>(['login']);
  const currentScreen: ScreenName = historyStack[historyStack.length - 1] || 'login';
  const [transitionType, setTransitionType] = useState<TransitionType>('replace');
  const [returnTo, setReturnTo] = useState<'dashboard' | 'map'>('dashboard');
  const [loginStage, setLoginStage] = useState<'stageA' | 'stageB'>('stageA');

  // Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Driver & Routes
  const [driver] = useState<DriverProfile>(CANONICAL_DRIVER);
  const [routes, setRoutes] = useState<RoutePlan[]>(createInitialRoutes());
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<number | null>(null);
  const [activeOutletId, setActiveOutletId] = useState<string | null>(null);
  const [selectedMapOutletId, setSelectedMapOutletId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [meterPhotos, setMeterPhotos] = useState<Record<number, RouteMeterPhotos>>({});

  const setRouteMeterPhoto = useCallback((routeId: number, moment: 'start' | 'end', record: MeterPhotoRecord) => {
    setMeterPhotos((prev) => ({
      ...prev,
      [routeId]: {
        ...prev[routeId],
        [moment]: record
      }
    }));
  }, []);

  const clearRouteMeterPhotos = useCallback((routeId: number) => {
    setMeterPhotos((prev) => {
      const next = { ...prev };
      delete next[routeId];
      return next;
    });
  }, []);

  // Conditions
  const [conditions, setConditions] = useState<PrototypeConditions>({
    networkStatus: 'good',
    gpsStatus: 'off',
    gpsQuality: 'strong',
    driverNearNextOutlet: false,
    nextPinResult: 'normal'
  });

  // Tracked Functions
  const [trackedFunctions, setTrackedFunctions] = useState<Record<string, boolean>>({
    G01: true // G01 App opens on Login Stage A
  });

  const track = useCallback((id: string) => {
    setTrackedFunctions((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });
  }, []);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    track('G02');
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 1800);
  }, [track]);

  const pushScreen = useCallback((screen: ScreenName) => {
    setTransitionType('push');
    setHistoryStack((prev) => [...prev, screen]);
  }, []);

  const popScreen = useCallback(() => {
    track('G03');
    setTransitionType('pop');
    setHistoryStack((prev) => {
      let nextStack: ScreenName[];
      if (prev.length > 1) {
        nextStack = prev.slice(0, -1);
      } else {
        const current = prev[0] || 'login';
        const fallback = getFallbackPrevScreen(current, returnTo);
        nextStack = getLogicalStackForScreen(fallback);
      }

      const target = nextStack[nextStack.length - 1];
      if (target === 'login') {
        setLoginStage('stageB');
      }
      return nextStack;
    });
  }, [track, returnTo]);

  const replaceScreen = useCallback((screen: ScreenName) => {
    setTransitionType('replace');
    setHistoryStack((prev) => {
      const next = [...prev];
      if (next.length > 0) next[next.length - 1] = screen;
      else next.push(screen);
      return next;
    });
  }, []);

  const selectRoute = useCallback((id: number | null) => {
    setSelectedRouteId(id);
    if (id !== null) {
      track('L06');
    } else {
      track('L07');
    }
  }, [track]);

  const toggleExpandRoute = useCallback((id: number) => {
    setExpandedRouteId((prev) => {
      const next = prev === id ? null : id;
      if (next !== null) track('L05');
      return next;
    });
  }, [track]);

  const startRoute = useCallback((id: number) => {
    setSelectedRouteId(id);
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            status: 'in_progress',
            startedAt: r.startedAt || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return r;
      })
    );
  }, []);

  const finishRoute = useCallback((id: number) => {
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            status: 'completed',
            finishedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          };
        }
        return r;
      })
    );
  }, []);

  const toggleProductCheck = useCallback((outletId: string, productId: string) => {
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => {
          if (o.id !== outletId) return o;
          const products = o.products.map((p) => {
            if (p.id === productId) return { ...p, checked: !p.checked };
            return p;
          });
          const allChecked = products.every((p) => p.checked);
          return {
            ...o,
            products,
            status: products.some((p) => p.checked) ? 'in_progress' : o.status,
            unpackingComplete: allChecked ? o.unpackingComplete : false
          };
        })
      }))
    );
    track('M01');
  }, [track]);

  const markUnpackingComplete = useCallback((outletId: string, complete: boolean = true) => {
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => {
          if (o.id !== outletId) return o;
          return { ...o, unpackingComplete: complete, status: 'in_progress' };
        })
      }))
    );
  }, []);

  const completeOutlet = useCallback((outletId: string, isOffline: boolean = false) => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => {
          if (o.id !== outletId) return o;
          return {
            ...o,
            status: 'completed',
            completedAt: timeStr,
            syncStatus: isOffline ? 'pending' : 'synced',
            confirmation: {
              ...o.confirmation,
              approvalStatus: 'approved'
            }
          };
        })
      }))
    );
  }, []);

  const syncPendingOutlets = useCallback(async () => {
    setIsSyncing(true);
    track('S03');
    await new Promise((r) => setTimeout(r, 600));
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => ({ ...o, syncStatus: 'synced' }))
      }))
    );
    setMeterPhotos((prev) => {
      const next: Record<number, RouteMeterPhotos> = {};
      for (const [rId, photos] of Object.entries(prev)) {
        next[Number(rId)] = {
          start: photos.start ? { ...photos.start, syncStatus: 'synced' } : undefined,
          end: photos.end ? { ...photos.end, syncStatus: 'synced' } : undefined
        };
      }
      return next;
    });
    setIsSyncing(false);
  }, [track]);

  const updateCondition = useCallback(<K extends keyof PrototypeConditions>(key: K, value: PrototypeConditions[K]) => {
    setConditions((prev) => ({ ...prev, [key]: value }));
    if (key === 'networkStatus' || key === 'gpsStatus' || key === 'gpsQuality') {
      track('L04');
    }
  }, [track]);

  const selectedRoute = useMemo(() => {
    const active = routes.find((r) => r.id === selectedRouteId);
    if (active) return active;
    return routes.find((r) => r.status === 'in_progress') || routes[0];
  }, [routes, selectedRouteId]);

  const activeOutlet = useMemo(() => {
    if (!selectedRoute) return undefined;
    if (activeOutletId) {
      const found = selectedRoute.outlets.find((o) => o.id === activeOutletId);
      if (found) return found;
    }
    return selectedRoute.outlets[0];
  }, [selectedRoute, activeOutletId]);

  const completedOutletsCount = useMemo(() => {
    return selectedRoute?.outlets.filter((o) => o.status === 'completed').length || 0;
  }, [selectedRoute]);

  const totalOutletsCount = useMemo(() => {
    return selectedRoute?.outlets.length || 0;
  }, [selectedRoute]);

  const allOutletsCompleted = useMemo(() => {
    return totalOutletsCount > 0 && completedOutletsCount === totalOutletsCount;
  }, [totalOutletsCount, completedOutletsCount]);

  const upNextOutlet = useMemo(() => {
    if (!selectedRoute) return null;
    const inProg = selectedRoute.outlets.find((o) => o.status === 'in_progress');
    if (inProg) return inProg;
    const pending = selectedRoute.outlets.find((o) => o.status === 'pending');
    return pending || null;
  }, [selectedRoute]);

  // Store Manager Actions
  const managerApprove = useCallback((outletId?: string) => {
    const targetId = outletId || activeOutlet?.id;
    if (!targetId) return;
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => {
          if (o.id !== targetId) return o;
          return {
            ...o,
            confirmation: { ...o.confirmation, approvalStatus: 'approved' }
          };
        })
      }))
    );
    track('P07');
  }, [activeOutlet, track]);

  const managerReject = useCallback((outletId?: string, reason: string = '2 items reported damaged') => {
    const targetId = outletId || activeOutlet?.id;
    if (!targetId) return;
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => {
          if (o.id !== targetId) return o;
          return {
            ...o,
            confirmation: { ...o.confirmation, approvalStatus: 'rejected', rejectionReason: reason }
          };
        })
      }))
    );
    track('P06');
  }, [activeOutlet, track]);

  const issueNewPin = useCallback((outletId?: string) => {
    const targetId = outletId || activeOutlet?.id;
    if (!targetId) return;
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => {
          if (o.id !== targetId) return o;
          return {
            ...o,
            confirmation: {
              ...o.confirmation,
              attemptsLeft: 3,
              locked: false,
              expired: false
            }
          };
        })
      }))
    );
  }, [activeOutlet]);

  const expirePin = useCallback((outletId?: string) => {
    const targetId = outletId || activeOutlet?.id;
    if (!targetId) return;
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => {
          if (o.id !== targetId) return o;
          return {
            ...o,
            confirmation: { ...o.confirmation, expired: true }
          };
        })
      }))
    );
    track('P06');
  }, [activeOutlet, track]);

  const resetTicks = useCallback(() => {
    setTrackedFunctions({ G01: true });
  }, []);

  const resetDemo = useCallback(() => {
    setRoutes(createInitialRoutes());
    setSelectedRouteId(null);
    setExpandedRouteId(null);
    setActiveOutletId(null);
    setSelectedMapOutletId(null);
    setLoginStage('stageA');
    setHistoryStack(['login']);
    setTransitionType('replace');
    setConditions({
      networkStatus: 'good',
      gpsStatus: 'off',
      gpsQuality: 'strong',
      driverNearNextOutlet: false,
      nextPinResult: 'normal'
    });
    setMeterPhotos({});
    setTrackedFunctions({ G01: true });
  }, []);

  const jumpToScreen = useCallback((screen: ScreenName) => {
    setTransitionType('replace');
    setHistoryStack(getLogicalStackForScreen(screen));

    // Seed sensible mock state for target screen
    if (screen === 'login') {
      setLoginStage('stageB');
      setSelectedRouteId(null);
    } else if (screen === 'meter_photo_start') {
      setSelectedRouteId(1);
      setLoginStage('stageB');
    } else if (screen === 'dashboard') {
      setSelectedRouteId(1);
      setLoginStage('stageB');
    } else if (screen === 'market_detail') {
      setSelectedRouteId(1);
      const r1 = routes[0];
      if (r1 && r1.outlets[0]) {
        setActiveOutletId(r1.outlets[0].id);
      }
    } else if (screen === 'pin_confirmation') {
      setSelectedRouteId(1);
      const r1 = routes[0];
      if (r1 && r1.outlets[0]) {
        setActiveOutletId(r1.outlets[0].id);
        setRoutes((prev) =>
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
      setSelectedRouteId(2);
      setSelectedMapOutletId(null);
    } else if (screen === 'meter_photo_end') {
      setSelectedRouteId(2);
      setRoutes((prev) =>
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
      setSelectedRouteId(2);
      setRoutes((prev) =>
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
                syncStatus: (o.city === 'Teldeniya' || o.city === 'Kundasale') ? 'pending' : 'synced'
              }))
            };
          }
          return r;
        })
      );
    }
  }, [routes]);

  return (
    <StoreContext.Provider
      value={{
        currentScreen,
        historyStack,
        transitionType,
        returnTo,
        loginStage,
        pushScreen,
        popScreen,
        replaceScreen,
        setReturnTo,
        setLoginStage,
        toastMessage,
        showToast,
        driver,
        routes,
        selectedRouteId,
        expandedRouteId,
        activeOutletId,
        selectedMapOutletId,
        selectRoute,
        toggleExpandRoute,
        startRoute,
        finishRoute,
        setActiveOutletId,
        setSelectedMapOutletId,
        toggleProductCheck,
        markUnpackingComplete,
        completeOutlet,
        syncPendingOutlets,
        isSyncing,
        meterPhotos,
        setRouteMeterPhoto,
        clearRouteMeterPhotos,
        conditions,
        setConditions,
        updateCondition,
        managerApprove,
        managerReject,
        issueNewPin,
        expirePin,
        selectedRoute,
        activeOutlet,
        completedOutletsCount,
        totalOutletsCount,
        allOutletsCompleted,
        upNextOutlet,
        trackedFunctions,
        track,
        resetTicks,
        resetDemo,
        jumpToScreen
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export const useStore = (): StoreContextType => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
};
