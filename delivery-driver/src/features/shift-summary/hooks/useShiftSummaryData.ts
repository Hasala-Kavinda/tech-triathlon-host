// src/features/shift-summary/hooks/useShiftSummaryData.ts - Real figures for the finished route

import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/state/store';
import { SyncState } from '@/shared/components/ui';
import type { OutletSummaryItem } from '@/shared/components/ui';
import type { Outlet, StopOutcome } from '@/shared/types';

/** Units actually handed over at a stop: nothing for a refused or closed stop. */
function deliveredUnits(outlet: Outlet) {
  if (outlet.outcome === 'refused' || outlet.outcome === 'closed' || outlet.outcome === 'failed') return 0;
  return outlet.products.reduce((sum, product) => sum + Math.max(0, Number(product.quantity) - (product.short ?? 0) - (product.damaged ?? 0)), 0);
}

function duration(startIso?: string, endIso?: string) {
  if (!startIso || !endIso) return '—';
  const minutes = Math.max(0, Math.round((Date.parse(endIso) - Date.parse(startIso)) / 60_000));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

const OUTCOME_ORDER: StopOutcome[] = ['delivered', 'partial', 'refused', 'closed', 'failed'];
const OUTCOME_WORDS: Record<StopOutcome, string> = { delivered: 'delivered', partial: 'partial', refused: 'refused', closed: 'closed', failed: 'failed' };

export function useShiftSummaryData() {
  const {
    routes,
    selectedRouteId,
    selectRoute,
    syncPendingOutlets,
    refreshRoute,
    isSyncing,
    conditions,
    track
  } = useStore();

  const [animationStep, setAnimationStep] = useState(0);

  // The route that was just finished: fixed when the screen opens (the selection is cleared below).
  const [finishedRouteId] = useState<number | null>(() => {
    const chosen = routes.find((route) => route.id === selectedRouteId);
    const lastCompleted = [...routes].reverse().find((route) => route.status === 'completed');
    return (chosen ?? lastCompleted ?? routes[0])?.id ?? null;
  });
  const finishedRoute = useMemo(() => routes.find((route) => route.id === finishedRouteId), [routes, finishedRouteId]);

  const outlets = useMemo<OutletSummaryItem[]>(() => {
    return (finishedRoute?.outlets ?? []).map((outlet) => ({
      id: outlet.id,
      city: outlet.city,
      itemCount: deliveredUnits(outlet),
      status: outlet.status,
      ...(outlet.completedAt ? { completedAt: outlet.completedAt } : {}),
      syncStatus: outlet.syncStatus,
      visitOrder: outlet.visitOrder,
      ...(outlet.outcome ? { outcome: outlet.outcome } : {}),
      ...(outlet.timingResult ? { timingResult: outlet.timingResult } : {})
    }));
  }, [finishedRoute]);

  const pendingCount = useMemo(() => outlets.filter((o) => o.syncStatus === 'pending').length, [outlets]);

  const totalItems = useMemo(() => outlets.reduce((acc, o) => acc + (o.itemCount || 0), 0), [outlets]);

  // "3 delivered · 1 partial · 1 refused · 4 on time · 1 late", from what the server recorded.
  const outcomeSummary = useMemo(() => {
    const parts = OUTCOME_ORDER
      .map((outcome) => ({ outcome, count: outlets.filter((o) => o.outcome === outcome).length }))
      .filter((entry) => entry.count > 0)
      .map((entry) => `${entry.count} ${OUTCOME_WORDS[entry.outcome]}`);
    const onTime = outlets.filter((o) => o.timingResult === 'on_time').length;
    const late = outlets.filter((o) => o.timingResult === 'late').length;
    if (onTime) parts.push(`${onTime} on time`);
    if (late) parts.push(`${late} late`);
    return parts.join(' · ');
  }, [outlets]);

  const totalTime = useMemo(() => duration(finishedRoute?.startedAtIso, finishedRoute?.finishedAtIso), [finishedRoute]);

  const otherRoutesRemain = useMemo(() => {
    const incompleteRoutes = routes.filter(
      (r) => r.id !== finishedRoute?.id && r.status !== 'completed'
    );
    return incompleteRoutes.length > 0;
  }, [routes, finishedRoute]);

  useEffect(() => {
    track('S01');
    if (selectedRouteId !== null) {
      selectRoute(null);
    }
    // Pick up the server's outcome and on-time/late result for each stop.
    if (finishedRoute?.apiId && navigator.onLine) {
      void refreshRoute(finishedRoute.id).catch((error) => console.error('Summary refresh failed', error));
    }
    // Runs once when the summary opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const isReduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isReduced) {
      setAnimationStep(4);
      return;
    }

    const t1 = setTimeout(() => setAnimationStep(1), 40);
    const t2 = setTimeout(() => setAnimationStep(2), 80);
    const t3 = setTimeout(() => setAnimationStep(3), 120);
    const t4 = setTimeout(() => setAnimationStep(4), 160);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, []);

  const syncStatus: SyncState = isSyncing ? 'syncing' : pendingCount > 0 ? 'pending' : 'synced';

  const handleSyncNow = () => {
    track('S03');
    void syncPendingOutlets();
  };

  return {
    finishedRoute,
    outlets,
    pendingCount,
    totalItems,
    totalTime,
    outcomeSummary,
    otherRoutesRemain,
    animationStep,
    syncStatus,
    isSyncing,
    conditions,
    handleSyncNow
  };
}
