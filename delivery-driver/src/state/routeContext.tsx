import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useMemo } from 'react';
import { INITIAL_ROUTES, MockApiService } from '../services/mockApi';
import { useSyncQueue } from './syncQueueContext';
import { useDriver } from './driverContext';

export type StopStatus = 'pending' | 'in_progress' | 'completed' | 'attention';

export interface Stop {
  id: number;
  stopNumber?: number;
  name: string;
  address?: string;
  dock?: string;
  managerName?: string;
  managerPhone?: string;
  deliveryNotes?: string;
  warningNote?: string;
  eta?: string;
  distance?: string;
  completedTime?: string;
  verifiedPin?: string;
  status: StopStatus;
  products?: any[];
  x?: number;
  y?: number;
  outletId?: string;
}

export interface OutletProduct {
  id: string;
  name: string;
  quantity: number | string;
  unit: string;
  chilled?: boolean;
  checked: boolean;
}

export const defaultProducts: OutletProduct[] = [
  { id: 'p-1', name: 'Fresh vegetables', quantity: 12, unit: 'cases', checked: false },
  { id: 'p-2', name: 'Dairy', quantity: 8, unit: 'cases', chilled: true, checked: false },
  { id: 'p-3', name: 'Bakery bread', quantity: 6, unit: 'trays', checked: false },
  { id: 'p-4', name: 'Cotton t-shirts', quantity: 4, unit: 'boxes', checked: false },
  { id: 'p-5', name: 'Denim jeans', quantity: 5, unit: 'boxes', checked: false },
  { id: 'p-6', name: 'Wireless earbuds', quantity: 3, unit: 'boxes', checked: false },
  { id: 'p-7', name: 'LED television 43"', quantity: 2, unit: 'units', checked: false }
];

export interface OutletConfirmation {
  approvalStatus?: 'waiting' | 'approved' | 'rejected';
  rejectionReason?: string;
  attemptsLeft?: number;
  locked?: boolean;
  expired?: boolean;
}

export interface Outlet {
  id: string;
  city: string;
  lat?: number;
  lng?: number;
  visitOrder?: number;
  managerName?: string;
  managerPhone?: string;
  itemCount: number;
  status: 'pending' | 'in_progress' | 'completed';
  unpackingComplete?: boolean;
  completedAt?: string;
  syncStatus?: 'synced' | 'pending';
  confirmation?: OutletConfirmation;
  products?: OutletProduct[];
  // Legacy compatibility fields
  pendingSync?: boolean;
}

export interface MapViewState {
  center: [number, number];
  zoom: number;
  selectedOutletId: string | null;
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

export interface RouteState {
  routes: RoutePlan[];
  selectedRouteId: number | null;
  activeOutletId: string | null;
  mapView: MapViewState | null;
}

export interface RouteContextType extends RouteState {
  // Named actions
  selectRoute: (routeId: number) => void;
  startRoute: (routeId: number) => void;
  toggleProduct: (outletId: string, productId: string) => void;
  markUnpackingComplete: (outletId: string) => void;
  submitPin: (
    outletId: string,
    pin: string
  ) => Promise<'ok' | 'queued' | 'wrong' | 'locked' | 'expired' | 'rejected'>;
  saveMapView: (view: MapViewState) => void;
  finishRoute: (routeId: number) => void;
  resetAllRoutes: () => void;

  // Selectors
  selectedRoute: RoutePlan | undefined;
  activeOutlet: Outlet | undefined;
  upNextOutlet: Outlet | null;
  completedCount: number;
  totalOutlets: number;
  allCompleted: boolean;
  inProgressRoute: RoutePlan | undefined;
  totalTodayRoutes: number;
  totalTodayOutlets: number;
  totalTodayDistance: number;

  // Backward compatibility
  setSelectedRouteId: (id: number | null) => void;
  setActiveOutletId: (id: string | null) => void;
  setMapView: (view: MapViewState | null) => void;
  updateOutletStatus: (routeId: number, outletId: string, status: 'pending' | 'in_progress' | 'completed') => void;
  toggleOutletProduct: (outletId: string, productId: string) => void;
  setOutletUnpackingComplete: (outletId: string, complete: boolean) => void;
  markOutletCompleted: (outletId: string, pendingSync?: boolean) => void;
  setOutletConfirmation: (outletId: string, confirmation: Partial<OutletConfirmation>) => void;
  stops: any[];
  activeStopId: number;
  activeStop: any;
  setActiveStopId: (id: number) => void;
  toggleProductChecked: (stopId: number, productId: string) => void;
  confirmPin: (stopId: number, enteredPin: string) => boolean;
  markStopCompleted: (stopId: number, pin?: string) => void;
  resetRoute: () => void;
  inProgressCount: number;
  pendingCount: number;
  totalItems: number;
  unpackedItems: number;
}

const STORAGE_KEY = 'waylink.v1.route';

const getInitialDeviceTime = (): string => {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
};

const loadPersistedRouteState = (): RouteState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.routes) && parsed.routes.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Discard corrupted state
  }
  return null;
};

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export const RouteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { enqueue, flushQueue } = useSyncQueue();
  const { networkStatus } = useDriver();

  const persisted = useMemo(() => loadPersistedRouteState(), []);

  const [routes, setRoutes] = useState<RoutePlan[]>(persisted?.routes || INITIAL_ROUTES);
  const [selectedRouteId, setSelectedRouteIdState] = useState<number | null>(
    persisted?.selectedRouteId ?? null
  );
  const [activeOutletId, setActiveOutletIdState] = useState<string | null>(
    persisted?.activeOutletId ?? null
  );
  const [mapView, setMapViewState] = useState<MapViewState | null>(persisted?.mapView ?? null);

  // Debounce ref for outlet_progress sync events
  const progressDebounceTimerRef = React.useRef<{ [outletId: string]: any }>({});

  // Persist route state on changes
  useEffect(() => {
    try {
      const toSave: RouteState = {
        routes,
        selectedRouteId,
        activeOutletId,
        mapView
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
      console.error('Failed to persist route state:', err);
    }
  }, [routes, selectedRouteId, activeOutletId, mapView]);

  // Derived: inProgressRoute
  const inProgressRoute = useMemo(() => {
    return routes.find((r) => r.status === 'in_progress');
  }, [routes]);

  // Derived: selectedRoute
  const selectedRoute = useMemo(() => {
    if (selectedRouteId != null) {
      return routes.find((r) => r.id === selectedRouteId);
    }
    return inProgressRoute;
  }, [routes, selectedRouteId, inProgressRoute]);

  // Derived: activeOutlet
  const activeOutlet = useMemo(() => {
    if (!activeOutletId) return undefined;
    for (const r of routes) {
      const found = r.outlets.find((o) => o.id === activeOutletId);
      if (found) return found;
    }
    return undefined;
  }, [routes, activeOutletId]);

  // Derived counts for selected route
  const currentOutlets = selectedRoute?.outlets || [];
  const completedCount = useMemo(() => {
    return currentOutlets.filter((o) => o.status === 'completed').length;
  }, [currentOutlets]);

  const totalOutlets = currentOutlets.length;
  const allCompleted = totalOutlets > 0 && completedCount === totalOutlets;

  // Derived: "Up next" outlet (first in_progress, or first pending)
  const upNextOutlet = useMemo(() => {
    if (!selectedRoute) return null;
    const inProg = selectedRoute.outlets.find((o) => o.status === 'in_progress');
    if (inProg) return inProg;
    const pending = selectedRoute.outlets.find((o) => o.status === 'pending');
    return pending || null;
  }, [selectedRoute]);

  // Derived totals for Today's Plan
  const totalTodayRoutes = routes.length;
  const totalTodayOutlets = useMemo(() => {
    return routes.reduce((sum, r) => sum + r.outlets.length, 0);
  }, [routes]);
  const totalTodayDistance = useMemo(() => {
    return routes.reduce((sum, r) => sum + r.distanceKm, 0);
  }, [routes]);

  // Action: selectRoute
  const selectRoute = useCallback((routeId: number) => {
    setSelectedRouteIdState(routeId);
  }, []);

  // Action: startRoute
  const startRoute = useCallback(
    (routeId: number) => {
      const now = getInitialDeviceTime();
      setRoutes((prev) =>
        prev.map((r) => {
          if (r.id === routeId) {
            return {
              ...r,
              status: 'in_progress',
              startedAt: r.startedAt || now
            };
          }
          return r;
        })
      );
      setSelectedRouteIdState(routeId);
      enqueue('route_start', { routeId, startedAt: now });
    },
    [enqueue]
  );

  // Action: toggleProduct
  const toggleProduct = useCallback(
    (outletId: string, productId: string) => {
      setRoutes((prev) =>
        prev.map((r) => {
          const outletIndex = r.outlets.findIndex((o) => o.id === outletId);
          if (outletIndex === -1) return r;

          const outlet = r.outlets[outletIndex];
          // Completed outlets can no longer be edited
          if (outlet.status === 'completed') return r;

          const productsList = outlet.products || [];
          const updatedProducts = productsList.map((p) => {
            if (p.id === productId) {
              return { ...p, checked: !p.checked };
            }
            return p;
          });

          const anyChecked = updatedProducts.some((p) => p.checked);
          const allChecked = updatedProducts.length > 0 && updatedProducts.every((p) => p.checked);

          // Rule: unchecking ANY product resets unpackingComplete to false
          let newUnpackingComplete = outlet.unpackingComplete;
          if (!allChecked) {
            newUnpackingComplete = false;
          }

          // Rule: pending -> in_progress when FIRST product checked.
          // in_progress -> pending if every product unchecked and unpackingComplete is false.
          let newStatus = outlet.status;
          if (anyChecked) {
            if (newStatus === 'pending') newStatus = 'in_progress';
          } else if (!newUnpackingComplete) {
            newStatus = 'pending';
          }

          const updatedOutlet: Outlet = {
            ...outlet,
            products: updatedProducts,
            unpackingComplete: newUnpackingComplete,
            status: newStatus
          };

          const newOutlets = [...r.outlets];
          newOutlets[outletIndex] = updatedOutlet;

          return { ...r, outlets: newOutlets };
        })
      );

      // Debounce 1s 'outlet_progress' enqueue
      if (progressDebounceTimerRef.current[outletId]) {
        clearTimeout(progressDebounceTimerRef.current[outletId]);
      }
      progressDebounceTimerRef.current[outletId] = setTimeout(() => {
        enqueue('outlet_progress', { outletId, productId });
      }, 1000);
    },
    [enqueue]
  );

  // Action: markUnpackingComplete
  const markUnpackingCompleteAction = useCallback((outletId: string) => {
    setRoutes((prev) =>
      prev.map((r) => {
        const outletIndex = r.outlets.findIndex((o) => o.id === outletId);
        if (outletIndex === -1) return r;

        const outlet = r.outlets[outletIndex];
        const updatedOutlet: Outlet = {
          ...outlet,
          unpackingComplete: true,
          status: 'in_progress'
        };

        const newOutlets = [...r.outlets];
        newOutlets[outletIndex] = updatedOutlet;
        return { ...r, outlets: newOutlets };
      })
    );
  }, []);

  // Action: submitPin
  const submitPin = useCallback(
    async (
      outletId: string,
      pin: string
    ): Promise<'ok' | 'queued' | 'wrong' | 'locked' | 'expired' | 'rejected'> => {
      // Find current outlet
      let targetOutlet: Outlet | undefined;
      for (const r of routes) {
        const o = r.outlets.find((out) => out.id === outletId);
        if (o) {
          targetOutlet = o;
          break;
        }
      }

      const attemptsLeft = targetOutlet?.confirmation?.attemptsLeft ?? 3;
      const isOffline = networkStatus === 'offline';

      const result = await MockApiService.verifyPin(pin, attemptsLeft, isOffline);
      const now = getInitialDeviceTime();

      if (result.status === 'ok') {
        setRoutes((prev) =>
          prev.map((r) => {
            const idx = r.outlets.findIndex((o) => o.id === outletId);
            if (idx === -1) return r;
            const updated: Outlet = {
              ...r.outlets[idx],
              status: 'completed',
              completedAt: now,
              syncStatus: 'synced',
              confirmation: {
                ...r.outlets[idx].confirmation,
                approvalStatus: 'approved'
              }
            };
            const newOutlets = [...r.outlets];
            newOutlets[idx] = updated;
            return { ...r, outlets: newOutlets };
          })
        );
      } else if (result.status === 'queued') {
        // Offline PIN submission
        setRoutes((prev) =>
          prev.map((r) => {
            const idx = r.outlets.findIndex((o) => o.id === outletId);
            if (idx === -1) return r;
            const updated: Outlet = {
              ...r.outlets[idx],
              status: 'completed',
              completedAt: now,
              syncStatus: 'pending',
              confirmation: {
                ...r.outlets[idx].confirmation,
                approvalStatus: 'approved'
              }
            };
            const newOutlets = [...r.outlets];
            newOutlets[idx] = updated;
            return { ...r, outlets: newOutlets };
          })
        );
        enqueue('pin_submission', { outletId, pin });
      } else if (result.status === 'wrong') {
        const nextAttempts = result.attemptsLeft ?? attemptsLeft - 1;
        setRoutes((prev) =>
          prev.map((r) => {
            const idx = r.outlets.findIndex((o) => o.id === outletId);
            if (idx === -1) return r;
            const updated: Outlet = {
              ...r.outlets[idx],
              confirmation: {
                ...r.outlets[idx].confirmation,
                attemptsLeft: nextAttempts,
                locked: nextAttempts <= 0
              }
            };
            const newOutlets = [...r.outlets];
            newOutlets[idx] = updated;
            return { ...r, outlets: newOutlets };
          })
        );
      } else if (result.status === 'locked') {
        setRoutes((prev) =>
          prev.map((r) => {
            const idx = r.outlets.findIndex((o) => o.id === outletId);
            if (idx === -1) return r;
            const updated: Outlet = {
              ...r.outlets[idx],
              confirmation: {
                ...r.outlets[idx].confirmation,
                attemptsLeft: 0,
                locked: true
              }
            };
            const newOutlets = [...r.outlets];
            newOutlets[idx] = updated;
            return { ...r, outlets: newOutlets };
          })
        );
      } else if (result.status === 'expired') {
        setRoutes((prev) =>
          prev.map((r) => {
            const idx = r.outlets.findIndex((o) => o.id === outletId);
            if (idx === -1) return r;
            const updated: Outlet = {
              ...r.outlets[idx],
              confirmation: {
                ...r.outlets[idx].confirmation,
                expired: true
              }
            };
            const newOutlets = [...r.outlets];
            newOutlets[idx] = updated;
            return { ...r, outlets: newOutlets };
          })
        );
      } else if (result.status === 'rejected') {
        setRoutes((prev) =>
          prev.map((r) => {
            const idx = r.outlets.findIndex((o) => o.id === outletId);
            if (idx === -1) return r;
            const updated: Outlet = {
              ...r.outlets[idx],
              confirmation: {
                ...r.outlets[idx].confirmation,
                approvalStatus: 'rejected',
                rejectionReason: result.rejectionReason || 'Damaged goods detected.'
              }
            };
            const newOutlets = [...r.outlets];
            newOutlets[idx] = updated;
            return { ...r, outlets: newOutlets };
          })
        );
      }

      return result.status;
    },
    [routes, networkStatus, enqueue]
  );

  // Action: saveMapView
  const saveMapView = useCallback((view: MapViewState) => {
    setMapViewState(view);
  }, []);

  // Action: finishRoute
  const finishRoute = useCallback(
    (routeId: number) => {
      const now = getInitialDeviceTime();
      setRoutes((prev) =>
        prev.map((r) => {
          if (r.id === routeId) {
            return {
              ...r,
              status: 'completed',
              finishedAt: now
            };
          }
          return r;
        })
      );
      enqueue('route_finish', { routeId, finishedAt: now });
    },
    [enqueue]
  );

  // Action: resetAllRoutes
  const resetAllRoutes = useCallback(() => {
    setRoutes(INITIAL_ROUTES);
    setSelectedRouteIdState(null);
    setActiveOutletIdState(null);
    setMapViewState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  // Listen to queue sync completions to flip outlet syncStatus to 'synced'
  useEffect(() => {
    const handleSyncComplete = (e: CustomEvent) => {
      const syncedOutletId = e.detail?.outletId;
      if (syncedOutletId) {
        setRoutes((prev) =>
          prev.map((r) => {
            const idx = r.outlets.findIndex((o) => o.id === syncedOutletId);
            if (idx === -1) return r;
            const updated: Outlet = { ...r.outlets[idx], syncStatus: 'synced' };
            const newOutlets = [...r.outlets];
            newOutlets[idx] = updated;
            return { ...r, outlets: newOutlets };
          })
        );
      }
    };
    window.addEventListener('waylink_item_synced' as any, handleSyncComplete as any);
    return () => window.removeEventListener('waylink_item_synced' as any, handleSyncComplete as any);
  }, []);

  // Backward compatibility methods
  const setSelectedRouteId = setSelectedRouteIdState;
  const setActiveOutletId = setActiveOutletIdState;
  const setMapView = setMapViewState;

  const updateOutletStatus = useCallback(
    (routeId: number, outletId: string, status: 'pending' | 'in_progress' | 'completed') => {
      setRoutes((prev) =>
        prev.map((r) => {
          if (r.id !== routeId) return r;
          const idx = r.outlets.findIndex((o) => o.id === outletId);
          if (idx === -1) return r;
          const updated: Outlet = { ...r.outlets[idx], status };
          const newOutlets = [...r.outlets];
          newOutlets[idx] = updated;
          return { ...r, outlets: newOutlets };
        })
      );
    },
    []
  );

  const toggleOutletProduct = useCallback(
    (outletId: string, productId: string) => {
      toggleProduct(outletId, productId);
    },
    [toggleProduct]
  );

  const setOutletUnpackingComplete = useCallback(
    (outletId: string, _complete: boolean) => {
      markUnpackingCompleteAction(outletId);
    },
    [markUnpackingCompleteAction]
  );

  const markOutletCompleted = useCallback((outletId: string, pendingSync: boolean = false) => {
    const now = getInitialDeviceTime();
    setRoutes((prev) =>
      prev.map((r) => {
        const idx = r.outlets.findIndex((o) => o.id === outletId);
        if (idx === -1) return r;
        const updated: Outlet = {
          ...r.outlets[idx],
          status: 'completed',
          completedAt: now,
          syncStatus: pendingSync ? 'pending' : 'synced',
          confirmation: {
            ...r.outlets[idx].confirmation,
            approvalStatus: 'approved'
          }
        };
        const newOutlets = [...r.outlets];
        newOutlets[idx] = updated;
        return { ...r, outlets: newOutlets };
      })
    );
  }, []);

  const setOutletConfirmation = useCallback(
    (outletId: string, confirmation: Partial<OutletConfirmation>) => {
      setRoutes((prev) =>
        prev.map((r) => {
          const idx = r.outlets.findIndex((o) => o.id === outletId);
          if (idx === -1) return r;
          const updated: Outlet = {
            ...r.outlets[idx],
            confirmation: { ...r.outlets[idx].confirmation, ...confirmation }
          };
          const newOutlets = [...r.outlets];
          newOutlets[idx] = updated;
          return { ...r, outlets: newOutlets };
        })
      );
    },
    []
  );

  // Dummy stops compatibility for older component props
  const stops: any[] = useMemo(() => {
    return (selectedRoute?.outlets || []).map((o, idx) => ({
      id: idx + 1,
      name: o.city,
      outletId: o.id,
      status: o.status,
      address: `${o.city} Central Delivery Dock`,
      managerName: o.managerName,
      managerPhone: o.managerPhone,
      products: o.products
    }));
  }, [selectedRoute]);

  const [activeStopId, setActiveStopId] = useState(1);
  const activeStop = stops.find((s) => s.id === activeStopId) || stops[0];

  const inProgressCount = useMemo(() => {
    return currentOutlets.filter((o) => o.status === 'in_progress').length;
  }, [currentOutlets]);

  const pendingCount = useMemo(() => {
    return currentOutlets.filter((o) => o.status === 'pending').length;
  }, [currentOutlets]);

  const totalItems = useMemo(() => {
    return currentOutlets.reduce((sum, o) => sum + o.itemCount, 0);
  }, [currentOutlets]);

  const unpackedItems = useMemo(() => {
    return currentOutlets
      .filter((o) => o.status === 'completed' || o.unpackingComplete)
      .reduce((sum, o) => sum + o.itemCount, 0);
  }, [currentOutlets]);

  return (
    <RouteContext
      value={{
        routes,
        selectedRouteId,
        activeOutletId,
        mapView,
        selectRoute,
        startRoute,
        toggleProduct,
        markUnpackingComplete: markUnpackingCompleteAction,
        submitPin,
        saveMapView,
        finishRoute,
        resetAllRoutes,
        selectedRoute,
        activeOutlet,
        upNextOutlet,
        completedCount,
        totalOutlets,
        allCompleted,
        inProgressRoute,
        totalTodayRoutes,
        totalTodayOutlets,
        totalTodayDistance,
        setSelectedRouteId,
        setActiveOutletId,
        setMapView,
        updateOutletStatus,
        toggleOutletProduct,
        setOutletUnpackingComplete,
        markOutletCompleted,
        setOutletConfirmation,
        stops,
        activeStopId,
        activeStop,
        setActiveStopId,
        toggleProductChecked: () => {},
        confirmPin: () => true,
        markStopCompleted: () => {},
        resetRoute: resetAllRoutes,
        inProgressCount,
        pendingCount,
        totalItems,
        unpackedItems
      }}
    >
      {children}
    </RouteContext>
  );
};

export const useRoute = (): RouteContextType => {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within RouteProvider');
  return ctx;
};
