import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRoute, Outlet, RoutePlan } from '../state/routeContext';
import { useDriver } from '../state/driverContext';
import { TopBar } from '../components/TopBar';
import { CompletionMark } from '../components/CompletionMark';
import { KeyFigures } from '../components/KeyFigures';
import { SyncStatus, SyncState } from '../components/SyncStatus';
import { OutletSummaryList } from '../components/OutletSummaryList';
import { EndShiftSheet } from '../components/EndShiftSheet';
import { NavTab } from '../components/BottomNav';

export interface ShiftSummaryProps {
  onClockOut: () => void;
  onNavigateTab: (tab: NavTab) => void;
  onBackToPlan?: () => void;
  // Overrides for states / Figma frames / testing
  overrideState?: 'complete' | 'pending' | 'syncing' | 'last_route' | 'offline' | 'expanded' | 'sheet';
  overrideOutlets?: Outlet[];
  overrideIsLastRoute?: boolean;
}

// Canonical mock outlets matching specification
export const defaultShiftOutlets: Outlet[] = [
  { id: 'out-1', city: 'Kandy', itemCount: 14, status: 'completed', completedAt: '05:48', syncStatus: 'synced', visitOrder: 1 },
  { id: 'out-2', city: 'Peradeniya', itemCount: 10, status: 'completed', completedAt: '06:15', syncStatus: 'synced', visitOrder: 2 },
  { id: 'out-3', city: 'Gampola', itemCount: 11, status: 'completed', completedAt: '06:45', syncStatus: 'synced', visitOrder: 3 },
  { id: 'out-4', city: 'Katugastota', itemCount: 8, status: 'completed', completedAt: '07:20', syncStatus: 'synced', visitOrder: 4 },
  { id: 'out-5', city: 'Kadugannawa', itemCount: 9, status: 'completed', completedAt: '07:55', syncStatus: 'synced', visitOrder: 5 },
  { id: 'out-6', city: 'Nawalapitiya', itemCount: 12, status: 'completed', completedAt: '08:30', syncStatus: 'synced', visitOrder: 6 },
  { id: 'out-7', city: 'Pilimatalawa', itemCount: 7, status: 'completed', completedAt: '09:05', syncStatus: 'synced', visitOrder: 7 },
  { id: 'out-8', city: 'Ampitiya', itemCount: 9, status: 'completed', completedAt: '09:35', syncStatus: 'synced', visitOrder: 8 },
  { id: 'out-9', city: 'Digana', itemCount: 8, status: 'completed', completedAt: '10:05', syncStatus: 'synced', visitOrder: 9 },
  { id: 'out-10', city: 'Akurana', itemCount: 10, status: 'completed', completedAt: '10:28', syncStatus: 'synced', visitOrder: 10 },
  { id: 'out-11', city: 'Wattegama', itemCount: 6, status: 'completed', completedAt: '10:50', syncStatus: 'synced', visitOrder: 11 },
  { id: 'out-12', city: 'Teldeniya', itemCount: 8, status: 'completed', completedAt: '11:08', syncStatus: 'synced', visitOrder: 12 },
  { id: 'out-13', city: 'Kundasale', itemCount: 7, status: 'completed', completedAt: '11:22', syncStatus: 'synced', visitOrder: 13 },
  { id: 'out-14', city: 'Mawanella', itemCount: 7, status: 'completed', completedAt: '11:32', syncStatus: 'synced', visitOrder: 14 }
];

export const ShiftSummary: React.FC<ShiftSummaryProps> = ({
  onClockOut,
  onNavigateTab,
  onBackToPlan,
  overrideState,
  overrideOutlets,
  overrideIsLastRoute
}) => {
  const { routes, selectedRouteId, setSelectedRouteId } = useRoute();
  const { gpsStatus, goOffline } = useDriver();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(overrideState === 'sheet');
  const [syncStatus, setSyncStatus] = useState<SyncState>(() => {
    if (overrideState === 'syncing') return 'syncing';
    if (overrideState === 'pending') return 'pending';
    return 'synced';
  });

  // Staggered arrival animation state
  const [animationStep, setAnimationStep] = useState(0);

  // Active or completed route data
  const route = useMemo(() => {
    const r2 = routes.find((r) => r.id === 2 || r.routeNumber === 2);
    if (r2) return r2;
    const current = routes.find((r) => r.id === selectedRouteId);
    return current || routes[0];
  }, [routes, selectedRouteId]);

  // Sync / pending outlets computation
  const outlets = useMemo(() => {
    if (overrideOutlets) return overrideOutlets;

    // In pending/syncing frames or offline, mark Teldeniya and Kundasale as waiting to sync
    if (overrideState === 'pending' || overrideState === 'syncing' || overrideState === 'offline') {
      return defaultShiftOutlets.map((o) => {
        if (o.city === 'Teldeniya' || o.city === 'Kundasale') {
          return { ...o, syncStatus: 'pending' as const, pendingSync: true };
        }
        return o;
      });
    }

    // Default to mock data if route has empty/incomplete outlets
    if (!route || !route.outlets || route.outlets.length < 5) {
      return defaultShiftOutlets;
    }

    return route.outlets.map((o, idx) => ({
      ...o,
      completedAt: o.completedAt || defaultShiftOutlets[idx]?.completedAt || '11:00',
      syncStatus: (o.syncStatus || (o.pendingSync ? 'pending' : 'synced')) as 'synced' | 'pending'
    }));
  }, [overrideOutlets, overrideState, route]);

  const pendingCount = useMemo(() => {
    return outlets.filter((o) => o.syncStatus === 'pending' || o.pendingSync).length;
  }, [outlets]);

  // Total items calculation
  const totalItems = useMemo(() => {
    const sum = outlets.reduce((acc, o) => acc + (o.itemCount || 0), 0);
    return sum > 0 ? sum : 126;
  }, [outlets]);

  // Determine if other routes remain today
  const otherRoutesRemain = useMemo(() => {
    if (overrideIsLastRoute !== undefined) return !overrideIsLastRoute;
    if (overrideState === 'last_route') return false;
    const incompleteRoutes = routes.filter((r) => r.id !== route?.id && r.status !== 'completed');
    return incompleteRoutes.length > 0;
  }, [routes, route, overrideIsLastRoute, overrideState]);

  // On arrival lifecycle: mark route completed, set finishedAt, clear selectedRouteId
  useEffect(() => {
    if (route && route.status !== 'completed') {
      route.status = 'completed';
      route.finishedAt = route.finishedAt || '11:48';
    }
    // Clear selected route ID on arrival as per specification
    if (selectedRouteId !== null) {
      setSelectedRouteId(null);
    }
  }, [route, selectedRouteId, setSelectedRouteId]);

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

  // Handle manual sync trigger
  const handleSyncNow = () => {
    setSyncStatus('syncing');
    setTimeout(() => {
      setSyncStatus('synced');
    }, 1500);
  };

  // Handle "Back to today's plan"
  const handleBackToPlan = () => {
    if (onBackToPlan) {
      onBackToPlan();
    } else {
      // In App.tsx handleClockOut sets screen back to login (Today's Plan)
      onClockOut();
    }
  };

  // Confirm shift termination from bottom sheet
  const handleConfirmEndShift = () => {
    setIsSheetOpen(false);
    goOffline();
    onClockOut();
  };

  const isOffline = overrideState === 'offline';
  const networkStatus = isOffline ? 'offline' : 'good';

  return (
    <main
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full max-w-[390px] min-h-[844px] h-screen bg-bg flex flex-col justify-between relative shadow-2xl border-x border-hairline/40 select-none overflow-hidden"
    >
      {/* 1. TopBar (centered "Fleet Logistics", NO back chevron) */}
      <TopBar title="Fleet Logistics" showBackButton={false} isScrolled={isScrolled} />

      {/* Main Scrollable Canvas */}
      <div
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 4)}
        className="flex-1 px-4 overflow-y-auto pt-2 pb-36 space-y-5"
      >
        {/* 2. Completion mark: 64px emerald circle with white check */}
        <div className="pt-2">
          <CompletionMark />
        </div>

        {/* 3. Title block (centered) */}
        <div
          className="text-center space-y-1 transition-opacity duration-200"
          style={{ opacity: animationStep >= 1 ? 1 : 0 }}
        >
          <h1 className="text-[28px] font-bold text-black dark:text-white tracking-tight leading-tight">
            Route <span className="font-mono tabular-nums">{route?.routeNumber ?? 2}</span> complete
          </h1>
          <p className="text-[15px] text-secondary font-normal tracking-tight">
            {route?.brandName ?? 'Waypoint'} ·{' '}
            <span className="font-mono tabular-nums">
              {route?.startedAt ?? '05:12'} to {route?.finishedAt ?? '11:48'}
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
            distanceKm={route?.distanceKm ?? 42}
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
            networkStatus={networkStatus}
            gpsStatus={isOffline ? 'off' : gpsStatus}
          />
        </div>

        {/* 6. Outlets card (inset grouped card) */}
        <div
          className="transition-opacity duration-200"
          style={{ opacity: animationStep >= 4 ? 1 : 0 }}
        >
          <OutletSummaryList
            outlets={outlets}
            initialExpanded={overrideState === 'expanded'}
          />
        </div>
      </div>

      {/* 7. Pinned Bottom Bar with solid page background & hairline on top */}
      <footer
        className={`w-full max-w-[390px] fixed bottom-0 left-0 right-0 mx-auto bg-bg px-4 pt-3 pb-7 flex flex-col gap-2 z-30 transition-all ${
          isScrolled ? 'border-t border-hairline' : 'border-t border-transparent'
        }`}
      >
        {otherRoutesRemain ? (
          <>
            {/* Primary Button: 56px, accent fill, white label */}
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
              onClick={() => setIsSheetOpen(true)}
              className="w-full h-11 text-secondary text-[15px] font-medium flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
            >
              End shift
            </button>
          </>
        ) : (
          /* Last route of the day: only "End shift" primary button */
          <button
            type="button"
            onClick={() => setIsSheetOpen(true)}
            className="w-full h-14 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-semibold text-[16px] flex items-center justify-center shadow-sm transition-all focus:outline-none cursor-pointer"
          >
            End shift
          </button>
        )}
      </footer>

      {/* End Shift Bottom Sheet */}
      <EndShiftSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onConfirmEndShift={handleConfirmEndShift}
        unsyncedCount={pendingCount}
      />
    </main>
  );
};
