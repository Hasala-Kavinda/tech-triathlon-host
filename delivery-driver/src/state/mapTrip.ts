// src/state/mapTrip.ts - Turns a trip from the API (with its orders and delivery records) into the app's RoutePlan

import type { ApiDelivery, ApiTripDetail } from '@/api/driver';
import type { Outlet, OutletProduct, RoutePlan, StopOutcome } from '@/shared/types';

const hhmm = (iso?: string) =>
  iso ? new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined;

const FINISHED = new Set(['delivered', 'failed', 'receipt_confirmed', 'receipt_issue']);

/** Names and units come from the orders; the quantities come from the delivery record. */
export function productsFromDelivery(
  delivery: ApiDelivery,
  catalogue: Map<string, { name: string; unit: string }>,
  previous: OutletProduct[] = []
): OutletProduct[] {
  return delivery.items.map((item) => {
    const before = previous.find((product) => product.id === item.sku);
    const info = catalogue.get(item.sku);
    return {
      id: item.sku,
      name: info?.name ?? item.sku,
      unit: info?.unit ?? 'units',
      quantity: item.expected,
      // What the Driver ticked or reported on this phone wins over the server's copy until it syncs.
      checked: before?.checked ?? FINISHED.has(delivery.status),
      short: before?.short ?? item.short,
      damaged: before?.damaged ?? item.damaged
    };
  });
}

export function catalogueOf(trip: Pick<ApiTripDetail, 'orders'>) {
  const catalogue = new Map<string, { name: string; unit: string }>();
  for (const order of trip.orders) for (const item of order.items) catalogue.set(item.sku, { name: item.name, unit: item.unit });
  return catalogue;
}

export function mapTripToRoute(trip: ApiTripDetail, index: number): RoutePlan {
  const catalogue = catalogueOf(trip);
  const deliveries = new Map((trip.deliveries ?? []).map((delivery) => [String(delivery.tripStopId), delivery]));
  const stops = [...trip.stops].sort((a, b) => a.sequence - b.sequence);

  const outlets: Outlet[] = stops.map((stop) => {
    const delivery = deliveries.get(String(stop.tripStopId));
    const order = trip.orders.find((candidate) => String(candidate._id) === String(stop.orderId));
    const products: OutletProduct[] = delivery
      ? productsFromDelivery(delivery, catalogue)
      : (order?.items ?? []).map((item) => ({ id: item.sku, name: item.name, quantity: item.quantity, unit: item.unit, checked: false, short: 0, damaged: 0 }));
    const completed = !!delivery && FINISHED.has(delivery.status);
    const arrived = !!delivery && delivery.status !== 'pending';
    return {
      id: stop.stopId,
      tripStopId: String(stop.tripStopId),
      // Outlet names are not available to the Driver; the outlet's ID is shown.
      city: stop.outletId,
      lat: 0,
      lng: 0,
      visitOrder: stop.sequence,
      managerName: '',
      managerPhone: '',
      itemCount: products.length,
      status: completed ? 'completed' : arrived ? 'in_progress' : 'pending',
      unpackingComplete: false,
      arrived,
      ...(delivery?.arrivedAt ? { arrivedAt: delivery.arrivedAt } : {}),
      ...(delivery?.outcome ? { outcome: delivery.outcome as StopOutcome } : {}),
      ...(delivery?.timingResult ? { timingResult: delivery.timingResult } : {}),
      ...(completed ? { completedAt: hhmm(delivery?.completedAt) } : {}),
      ...(delivery ? { apiVersion: delivery.version } : {}),
      syncStatus: 'synced',
      products,
      confirmation: { approvalStatus: 'waiting', attemptsLeft: 3, locked: false, expired: false }
    } as Outlet;
  });

  return {
    apiId: trip._id,
    version: trip.version,
    vehicleId: trip.vehicleId,
    claimed: trip.status === 'claimed' || trip.status === 'in_transit' || trip.status === 'completed',
    vehicleConfirmed: !!trip.vehicleConfirmedAt,
    id: index + 1,
    routeNumber: index + 1,
    brandName: trip.tripNumber,
    distanceKm: trip.distanceKm,
    status: trip.status === 'in_transit' ? 'in_progress' : trip.status === 'completed' ? 'completed' : 'pending',
    ...(trip.startedAt ? { startedAt: hhmm(trip.startedAt), startedAtIso: trip.startedAt } : {}),
    ...(trip.completedAt ? { finishedAt: hhmm(trip.completedAt), finishedAtIso: trip.completedAt } : {}),
    outlets
  } as RoutePlan;
}

/**
 * Brings a route up to date with the server without losing what is still waiting on this
 * phone: a stop completed offline stays completed until its changes have synced.
 */
export function mergeServerRoute(local: RoutePlan, server: RoutePlan): RoutePlan {
  return {
    ...server,
    id: local.id,
    routeNumber: local.routeNumber,
    outlets: server.outlets.map((outlet) => {
      const mine = local.outlets.find((candidate) => candidate.id === outlet.id);
      if (mine && mine.syncStatus === 'pending' && mine.status === 'completed' && outlet.status !== 'completed') return mine;
      return mine ? { ...outlet, products: outlet.products.map((p) => ({ ...p, checked: mine.products.find((q) => q.id === p.id)?.checked ?? p.checked })) } : outlet;
    })
  };
}
