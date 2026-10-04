// src/state/slices/routesSlice.ts - Routes, outlets, products, and manager actions

import { useState, useCallback, useMemo, useRef } from 'react';
import { RoutePlan, Outlet, OutletProduct, DriverProfile, StopOutcome } from '@/shared/types';
import { createInitialRoutes } from '@/shared/lib/mockData';
import { CANONICAL_DRIVER } from '@/shared/lib/constants';
import { driverApi, type StopItemInput } from '@/api/driver';
import { readSession } from '@/auth/session';
import { flushSyncQueue, queueArrival, stopsWithPendingChanges } from '@/offline/syncQueue';
import { mapTripToRoute, mergeServerRoute, productsFromDelivery } from '../mapTrip';

const PROTOTYPE = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === 'true';

export type RoutesStatus = 'loading' | 'ready' | 'error';

/** The delivered / short / damaged counts for a stop, as the server's items endpoint takes them. */
export function itemsOf(products: OutletProduct[]): StopItemInput[] {
  return products.map((product) => {
    const expected = Number(product.quantity);
    const short = product.short ?? 0;
    const damaged = product.damaged ?? 0;
    return { sku: product.id, delivered: expected - short - damaged, short, damaged };
  });
}

/** Refused and closed stops deliver nothing: every unit is accounted for as short. */
export function undeliveredItemsOf(products: OutletProduct[]): StopItemInput[] {
  return products.map((product) => ({ sku: product.id, delivered: 0, short: Number(product.quantity), damaged: 0 }));
}

export function useRoutesSlice(
  track: (id: string) => void,
  onSyncPhotos?: () => void
) {
  const [routes, setRoutes] = useState<RoutePlan[]>(PROTOTYPE ? createInitialRoutes() : []);
  // Callbacks that must stay stable read the latest routes from here.
  const routesRef = useRef(routes);
  routesRef.current = routes;
  const [routesStatus, setRoutesStatus] = useState<RoutesStatus>(PROTOTYPE ? 'ready' : 'loading');
  const [routesError, setRoutesError] = useState('');
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<number | null>(null);
  const [activeOutletId, setActiveOutletId] = useState<string | null>(null);
  const [selectedMapOutletId, setSelectedMapOutletId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Loads today's trips assigned to this Driver (the server filters by the signed-in Driver).
  const reloadRoutes = useCallback(async () => {
    if (PROTOTYPE) return;
    setRoutesStatus((current) => (current === 'ready' ? current : 'loading'));
    try {
      const trips = await driverApi.routesToday();
      const details = await Promise.all(trips.map((trip) => driverApi.tripDetail(trip._id)));
      setRoutes(details.map((detail, index) => mapTripToRoute(detail, index)));
      setRoutesError('');
      setRoutesStatus('ready');
    } catch (error) {
      console.error('Driver route list failed', error);
      setRoutesError(error instanceof Error ? error.message : 'Your routes could not be loaded.');
      setRoutesStatus('error');
    }
  }, []);

  // Re-reads one route from the server (for example to pick up on-time/late after a sync).
  const refreshRoute = useCallback(async (routeId: number) => {
    if (PROTOTYPE) return;
    const current = routesRef.current.find((route) => route.id === routeId);
    if (!current?.apiId) return;
    const detail = await driverApi.tripDetail(current.apiId);
    const fresh = mapTripToRoute(detail, routeId - 1);
    setRoutes((prev) => prev.map((route) => (route.id === routeId ? mergeServerRoute(route, fresh) : route)));
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

  // The trip is only marked as started here after the server has accepted the start.
  const startRoute = useCallback((id: number) => {
    setSelectedRouteId(id);
    const now = new Date();
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            status: 'in_progress',
            startedAt: r.startedAt || now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            startedAtIso: r.startedAtIso || now.toISOString()
          };
        }
        return r;
      })
    );
  }, []);

  const finishRoute = useCallback((id: number) => {
    const now = new Date();
    setRoutes((prev) =>
      prev.map((r) => {
        if (r.id === id) {
          return {
            ...r,
            status: 'completed',
            finishedAt: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            finishedAtIso: now.toISOString()
          };
        }
        return r;
      })
    );
  }, []);

  const setRouteVersion = useCallback((id: number, version: number) => {
    setRoutes((prev) => prev.map((route) => route.id === id ? { ...route, version } : route));
  }, []);

  // Claim the assignment and confirm the vehicle (two server steps), then keep the manifest on the phone.
  const claimRoute = useCallback(async (routeId: number) => {
    const route = routes.find((candidate) => candidate.id === routeId);
    if (!route?.apiId || route.version === undefined || !route.vehicleId) {
      // A prototype route has nothing to claim on a server.
      setRoutes((prev) => prev.map((r) => (r.id === routeId ? { ...r, claimed: true, vehicleConfirmed: true } : r)));
      return;
    }
    const bootstrap = await driverApi.claimAndBootstrap(route.apiId, route.vehicleId, route.version);
    const mapped = mapTripToRoute({ ...bootstrap.manifest.trip, orders: bootstrap.manifest.orders, deliveries: bootstrap.manifest.deliveries ?? [] }, routeId - 1);
    setRoutes((prev) => prev.map((r) => (r.id === routeId ? { ...mapped, id: r.id, routeNumber: r.routeNumber, version: bootstrap.bootstrapVersion, claimed: true, vehicleConfirmed: true } : r)));
  }, [routes]);

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

  // Report units short or damaged for one product; what is left is delivered.
  const setProductIssue = useCallback((outletId: string, productId: string, issue: { short: number; damaged: number }) => {
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => {
          if (o.id !== outletId) return o;
          return {
            ...o,
            unpackingComplete: false,
            products: o.products.map((p) => {
              if (p.id !== productId) return p;
              const expected = Number(p.quantity);
              const short = Math.max(0, Math.min(expected, Math.floor(issue.short) || 0));
              const damaged = Math.max(0, Math.min(expected - short, Math.floor(issue.damaged) || 0));
              return { ...p, short, damaged };
            })
          };
        })
      }))
    );
  }, []);

  // "I've arrived": recorded on the server when online, or queued with the real arrival time when offline.
  const arriveAtOutlet = useCallback(async (outletId: string) => {
    const route = routes.find((candidate) => candidate.outlets.some((outlet) => outlet.id === outletId));
    if (!route) return;
    const outlet = route.outlets.find((candidate) => candidate.id === outletId)!;
    if (outlet.arrived) return;
    const arrivedAt = new Date();
    let apiVersion = outlet.apiVersion;
    let tripVersion = route.version;
    let products = outlet.products;
    if (route.apiId && !PROTOTYPE) {
      if (navigator.onLine) {
        const result = await driverApi.arriveStop(route.apiId, outletId, arrivedAt);
        apiVersion = result.delivery.version;
        tripVersion = result.tripVersion;
        // The delivery record has the quantities that were actually loaded; names and units stay as they were.
        const names = new Map(outlet.products.map((product) => [product.id, { name: product.name, unit: product.unit }]));
        products = productsFromDelivery(result.delivery, names, outlet.products);
      } else {
        await queueArrival(route.apiId, outletId, arrivedAt);
      }
    }
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        version: r.id === route.id && tripVersion !== undefined ? tripVersion : r.version,
        outlets: r.outlets.map((o) => (o.id === outletId ? { ...o, arrived: true, arrivedAt: arrivedAt.toISOString(), apiVersion, products, status: 'in_progress' } : o))
      }))
    );
  }, [routes]);

  // The checklist is done: save the item counts now when online (offline, they are queued with the outcome).
  const markUnpackingComplete = useCallback(async (outletId: string, complete: boolean = true) => {
    const route = routes.find((candidate) => candidate.outlets.some((outlet) => outlet.id === outletId));
    const outlet = route?.outlets.find((candidate) => candidate.id === outletId);
    if (!route || !outlet) return;
    let deliveryVersion = outlet.apiVersion;
    if (complete && route.apiId && !PROTOTYPE) {
      if (!outlet.arrived) throw new Error('Confirm that you have arrived first.');
      if (navigator.onLine && deliveryVersion !== undefined) {
        const saved = await driverApi.saveItems(route.apiId, outletId, deliveryVersion, itemsOf(outlet.products));
        deliveryVersion = saved.version;
      }
    }
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => (o.id === outletId ? { ...o, apiVersion: deliveryVersion, unpackingComplete: complete, status: 'in_progress' } : o))
      }))
    );
  }, [routes]);

  const completeOutlet = useCallback((outletId: string, isOffline: boolean = false, outcome: StopOutcome = 'delivered') => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setRoutes((prev) =>
      prev.map((r) => ({
        ...r,
        outlets: r.outlets.map((o) => {
          if (o.id !== outletId) return o;
          return {
            ...o,
            status: 'completed',
            outcome,
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

  // Sends everything waiting on this phone to the server, then shows which stops are still waiting.
  const syncPendingOutlets = useCallback(async () => {
    setIsSyncing(true);
    track('S03');
    try {
      if (PROTOTYPE) {
        await new Promise((r) => setTimeout(r, 600));
        setRoutes((prev) => prev.map((r) => ({ ...r, outlets: r.outlets.map((o) => ({ ...o, syncStatus: 'synced' })) })));
      } else {
        await flushSyncQueue();
        const waiting = await stopsWithPendingChanges();
        setRoutes((prev) => prev.map((r) => ({ ...r, outlets: r.outlets.map((o) => ({ ...o, syncStatus: r.apiId && waiting.has(`${r.apiId}:${o.id}`) ? 'pending' : 'synced' })) })));
        await Promise.all(routesRef.current.filter((r) => r.apiId).map((r) => refreshRoute(r.id).catch((error) => console.error('Route refresh failed', error))));
      }
      if (onSyncPhotos) onSyncPhotos();
    } finally {
      setIsSyncing(false);
    }
  }, [track, onSyncPhotos, refreshRoute]);

  // Selectors
  const selectedRoute = useMemo(() => {
    const active = routes.find((r) => r.id === selectedRouteId);
    if (active) return active;
    return routes.find((r) => r.status === 'in_progress') || routes[0];
  }, [routes, selectedRouteId]);

  const session = readSession();
  const driver = useMemo<DriverProfile>(() => {
    if (PROTOTYPE) return CANONICAL_DRIVER;
    return {
      driverId: session?.user.employeeId ?? '—',
      name: session?.user.name ?? 'Driver',
      vehicleType: 'Vehicle',
      plateNumber: selectedRoute?.vehicleId ?? '—'
    };
  }, [session?.user.employeeId, session?.user.name, selectedRoute?.vehicleId]);

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

  // Stops are worked in stop-sequence order: the next stop is the first one not yet completed.
  const upNextOutlet = useMemo(() => {
    if (!selectedRoute) return null;
    const ordered = [...selectedRoute.outlets].sort((a, b) => a.visitOrder - b.visitOrder);
    return ordered.find((o) => o.status !== 'completed') ?? null;
  }, [selectedRoute]);

  /** Only the next stop in sequence can be opened. Returns why not, or null when it can. */
  const whyOutletLocked = useCallback((outletId: string): string | null => {
    if (!upNextOutlet || upNextOutlet.id === outletId) return null;
    const outlet = selectedRoute?.outlets.find((o) => o.id === outletId);
    if (outlet?.status === 'completed') return null;
    return `Finish stop ${upNextOutlet.visitOrder} (${upNextOutlet.city}) first.`;
  }, [upNextOutlet, selectedRoute]);

  // Store Manager Actions (prototype panel only)
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

  return {
    driver,
    routes,
    setRoutes,
    routesStatus,
    routesError,
    reloadRoutes,
    refreshRoute,
    selectedRouteId,
    setSelectedRouteId,
    expandedRouteId,
    setExpandedRouteId,
    activeOutletId,
    setActiveOutletId,
    selectedMapOutletId,
    setSelectedMapOutletId,
    isSyncing,
    selectRoute,
    toggleExpandRoute,
    claimRoute,
    startRoute,
    finishRoute,
    setRouteVersion,
    toggleProductCheck,
    setProductIssue,
    arriveAtOutlet,
    markUnpackingComplete,
    completeOutlet,
    syncPendingOutlets,
    selectedRoute,
    activeOutlet,
    completedOutletsCount,
    totalOutletsCount,
    allOutletsCompleted,
    upNextOutlet,
    whyOutletLocked,
    managerApprove,
    managerReject,
    issueNewPin,
    expirePin
  };
}
