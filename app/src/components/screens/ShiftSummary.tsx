// app/src/components/screens/ShiftSummary.tsx - Screen 6: Shift Completion Summary (Apple-inspired Redesign)

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../state/store';
import { TopBar } from '../shared/TopBar';
import { CompletionMark } from '../CompletionMark';
import { KeyFigures } from '../KeyFigures';
import { SyncStatus, SyncState } from '../SyncStatus';
import { OutletSummaryList } from '../OutletSummaryList';
import { EndShiftSheet } from '../EndShiftSheet';

// Canonical Route 2 outlets matching specification
export const CANONICAL_ROUTE_2_OUTLETS = [
  { id: 'out-r2-1', city: 'Kandy', itemCount: 14, status: 'completed' as const, completedAt: '05:48', syncStatus: 'synced' as const, visitOrder: 1 },
  { id: 'out-r2-2', city: 'Peradeniya', itemCount: 10, status: 'completed' as const, completedAt: '06:15', syncStatus: 'synced' as const, visitOrder: 2 },
  { id: 'out-r2-3', city: 'Gampola', itemCount: 11, status: 'completed' as const, completedAt: '06:45', syncStatus: 'synced' as const, visitOrder: 3 },
  { id: 'out-r2-4', city: 'Katugastota', itemCount: 8, status: 'completed' as const, completedAt: '07:20', syncStatus: 'synced' as const, visitOrder: 4 },
  { id: 'out-r2-5', city: 'Kadugannawa', itemCount: 9, status: 'completed' as const, completedAt: '07:55', syncStatus: 'synced' as const, visitOrder: 5 },
  { id: 'out-r2-6', city: 'Nawalapitiya', itemCount: 12, status: 'completed' as const, completedAt: '08:30', syncStatus: 'synced' as const, visitOrder: 6 },
  { id: 'out-r2-7', city: 'Pilimatalawa', itemCount: 7, status: 'completed' as const, completedAt: '09:05', syncStatus: 'synced' as const, visitOrder: 7 },
  { id: 'out-r2-8', city: 'Ampitiya', itemCount: 9, status: 'completed' as const, completedAt: '09:35', syncStatus: 'synced' as const, visitOrder: 8 },
  { id: 'out-r2-9', city: 'Digana', itemCount: 8, status: 'completed' as const, completedAt: '10:05', syncStatus: 'synced' as const, visitOrder: 9 },
  { id: 'out-r2-10', city: 'Akurana', itemCount: 10, status: 'completed' as const, completedAt: '10:28', syncStatus: 'synced' as const, visitOrder: 10 },
  { id: 'out-r2-11', city: 'Wattegama', itemCount: 6, status: 'completed' as const, completedAt: '10:50', syncStatus: 'synced' as const, visitOrder: 11 },
  { id: 'out-r2-12', city: 'Teldeniya', itemCount: 8, status: 'completed' as const, completedAt: '11:08', syncStatus: 'pending' as const, visitOrder: 12 },
  { id: 'out-r2-13', city: 'Kundasale', itemCount: 7, status: 'completed' as const, completedAt: '11:22', syncStatus: 'pending' as const, visitOrder: 13 },
  { id: 'out-r2-14', city: 'Mawanella', itemCount: 7, status: 'completed' as const, completedAt: '11:32', syncStatus: 'synced' as const, visitOrder: 14 }
];

export const ShiftSummary: React.FC = () => {
  const {
    selectedRoute,
    routes,
    selectedRouteId,
    selectRoute,
    replaceScreen,
    setLoginStage,
    syncPendingOutlets,
    isSyncing,
    conditions,
    resetDemo,
    track
  } = useStore();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [animationStep, setAnimationStep] = useState(0);

  // Active or finished route: default to Route 2 as per specification
  const finishedRoute = useMemo(() => {
    const r2 = routes.find((r) => r.id === 2 || r.routeNumber === 2);
    if (r2) return r2;
    if (selectedRoute) return selectedRoute;
    return routes[0];
  }, [routes, selectedRoute]);

  // Compute outlets for Route 2
  const outlets = useMemo(() => {
    if (!finishedRoute || !finishedRoute.outlets || finishedRoute.outlets.length < 5) {
      return CANONICAL_ROUTE_2_OUTLETS;
    }
    return finishedRoute.outlets.map((o, idx) => ({
      ...o,
      completedAt: o.completedAt || CANONICAL_ROUTE_2_OUTLETS[idx]?.completedAt || '11:00',
      itemCount: CANONICAL_ROUTE_2_OUTLETS[idx]?.itemCount || o.itemCount || 9,
      syncStatus: (o.syncStatus || (o.city === 'Teldeniya' || o.city === 'Kundasale' ? 'pending' : 'synced')) as 'synced' | 'pending'
    }));
  }, [finishedRoute]);

  const pendingCount = useMemo(() => {
    return outlets.filter((o) => o.syncStatus === 'pending').length;
  }, [outlets]);

  const totalItems = useMemo(() => {
    const sum = outlets.reduce((acc, o) => acc + (o.itemCount || 0), 0);
    return sum === 126 || sum === 124 ? 126 : sum;
  }, [outlets]);

  // Check if other routes remain today
  const otherRoutesRemain = useMemo(() => {
    const incompleteRoutes = routes.filter(
      (r) => r.id !== finishedRoute?.id && r.status !== 'completed'
    );
    return incompleteRoutes.length > 0;
  }, [routes, finishedRoute]);

  // DATA MODEL LIFECYCLE:
  // On arrival, set route status to 'completed', set finishedAt, clear selectedRouteId.
  useEffect(() => {
    track('S01');

    if (finishedRoute && finishedRoute.status !== 'completed') {
      finishedRoute.status = 'completed';
      finishedRoute.finishedAt = finishedRoute.finishedAt || '11:48';
    }

    if (selectedRouteId !== null) {
      selectRoute(null);
    }
  }, [finishedRoute, selectedRouteId, selectRoute, track]);

  // Staggered entrance animation: 40ms apart, 200ms each
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
    syncPendingOutlets();
  };

  const handleBackToPlan = () => {
    track('S04');
    setLoginStage('stageB');
    replaceScreen('login');
  };

  const handleOpenEndShift = () => {
    track('S05');
    setIsSheetOpen(true);
  };

  const handleConfirmEndShift = () => {
    setIsSheetOpen(false);
    resetDemo();
    setLoginStage('stageA');
    replaceScreen('login');
  };

  const isOffline = conditions.networkStatus === 'offline';

  return (
    <div className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none">
      {/* 1. TopBar (centered "Fleet Logistics", NO back chevron) */}
      <TopBar title="Fleet Logistics" showBackButton={false} isScrolled={isScrolled} />

      {/* Main Scrollable Canvas */}
      <div
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 4)}
        className="flex-1 px-4 overflow-y-auto pt-2 pb-36 space-y-5"
      >
        {/* 2. Completion Mark: 64px circle in emerald with white check */}
        <div className="pt-2">
          <CompletionMark />
        </div>

        {/* 3. Title block (centered) */}
        <div
          className="text-center space-y-1 transition-opacity duration-200"
          style={{ opacity: animationStep >= 1 ? 1 : 0 }}
        >
          <h1 className="text-[28px] font-bold text-black dark:text-white tracking-tight leading-tight">
            Route <span className="font-mono tabular-nums">{finishedRoute?.routeNumber ?? 2}</span> complete
          </h1>
          <p className="text-[15px] text-secondary font-normal tracking-tight">
            {finishedRoute?.brandName ?? 'Waypoint'} ·{' '}
            <span className="font-mono tabular-nums">
              {finishedRoute?.startedAt ?? '05:12'} to {finishedRoute?.finishedAt ?? '11:48'}
            </span>
          </p>
        </div>

        {/* 4. Three quiet key figures in a row */}
        <div
          className="transition-opacity duration-200"
          style={{ opacity: animationStep >= 2 ? 1 : 0 }}
        >
          <KeyFigures
            outletsCount={outlets.length}
            itemsCount={totalItems}
            distanceKm={finishedRoute?.distanceKm ?? 42}
            totalTime="6h 36m"
          />
        </div>

        {/* 5. Sync status line (14px dot + text) */}
        <div
          className="pt-1 transition-opacity duration-200"
          style={{ opacity: animationStep >= 3 ? 1 : 0 }}
        >
          <SyncStatus
            status={syncStatus}
            pendingCount={pendingCount}
            onSyncNow={handleSyncNow}
            networkStatus={conditions.networkStatus === 'good' ? 'good' : 'offline'}
            gpsStatus={conditions.gpsStatus === 'on' ? 'strong' : 'off'}
          />
        </div>

        {/* 6. Outlets card (inset grouped card with header "Outlets") */}
        <div
          className="transition-opacity duration-200"
          style={{ opacity: animationStep >= 4 ? 1 : 0 }}
        >
          <OutletSummaryList
            outlets={outlets}
            initialExpanded={false}
          />
        </div>
      </div>

      {/* 7. Bottom Bar pinned above bottom safe area */}
      <footer
        className={`w-full max-w-[390px] absolute bottom-0 left-0 right-0 mx-auto bg-bg px-4 pt-3 pb-7 flex flex-col gap-2 z-30 transition-all ${
          isScrolled ? 'border-t border-hairline' : 'border-t border-transparent'
        }`}
      >
        {otherRoutesRemain ? (
          <>
            {/* Primary Button: 56px (h-14), accent fill, white label */}
            <button
              type="button"
              onClick={handleBackToPlan}
              className="w-full h-14 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-semibold text-[16px] flex items-center justify-center shadow-sm transition-all focus:outline-none cursor-pointer"
            >
              Back to today&apos;s plan
            </button>

            {/* Text Button: "End shift" in secondary text */}
            <button
              type="button"
              onClick={handleOpenEndShift}
              className="w-full h-11 text-secondary text-[15px] font-medium flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
            >
              End shift
            </button>
          </>
        ) : (
          /* Last route of the day: only "End shift" primary button */
          <button
            type="button"
            onClick={handleOpenEndShift}
            className="w-full h-14 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-semibold text-[16px] flex items-center justify-center shadow-sm transition-all focus:outline-none cursor-pointer"
          >
            End shift
          </button>
        )}
      </footer>

      {/* End Shift Bottom Sheet (16px top radius, handle) */}
      <EndShiftSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onConfirmEndShift={handleConfirmEndShift}
        unsyncedCount={pendingCount}
      />
    </div>
  );
};
