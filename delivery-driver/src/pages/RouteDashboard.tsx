import React, { useEffect } from 'react';
import { useDriver } from '../state/driverContext';
import { useRoute, Outlet } from '../state/routeContext';
import { RouteHeader } from '../components/RouteHeader';
import { UpNextCard } from '../components/UpNextCard';
import { OutletListCard } from '../components/OutletListCard';
import { SwipeBar } from '../components/SwipeBar';
import { NavTab } from '../components/BottomNav';

export interface RouteDashboardProps {
  onOpenStop: (stopId: number) => void;
  onNavigateTab: (tab: NavTab) => void;
  onBackToLogin?: () => void;
  // Overrides for states / testing / preview frames
  overrideLoading?: boolean;
  overrideOffline?: boolean;
  overrideAllCompleted?: boolean;
  overrideOutlets?: Outlet[];
}

export const RouteDashboard: React.FC<RouteDashboardProps> = ({
  onOpenStop,
  onNavigateTab,
  onBackToLogin,
  overrideLoading = false,
  overrideOffline = false,
  overrideAllCompleted = false,
  overrideOutlets
}) => {
  const { gpsStatus, shiftStatus, toggleShiftStatus, name: driverName } = useDriver();
  const {
    routes,
    selectedRouteId,
    selectRoute,
    stops,
    setActiveStopId,
    setActiveOutletId,
    updateOutletStatus
  } = useRoute();

  // If no route selected, default to the first available route
  useEffect(() => {
    if (selectedRouteId === null && routes.length > 0) {
      selectRoute(routes[0].id);
    }
  }, [selectedRouteId, routes, selectRoute]);

  // Selected route data
  const effectiveRouteId = selectedRouteId ?? (routes.length > 0 ? routes[0].id : 1);
  const selectedRoute = routes.find((r) => r.id === effectiveRouteId) || routes[0];

  const rawOutlets = overrideOutlets || selectedRoute?.outlets || [];
  const outlets = overrideAllCompleted
    ? rawOutlets.map((o) => ({ ...o, status: 'completed' as const }))
    : rawOutlets;

  // Outlet status computations
  const completedCount = outlets.filter((o) => o.status === 'completed').length;
  const allOutletsCompleted =
    overrideAllCompleted || (outlets.length > 0 && completedCount === outlets.length);

  // "Up next" outlet: in_progress first, or first pending
  const inProgressOutlet = outlets.find((o) => o.status === 'in_progress');
  const nextPendingOutlet = outlets.find((o) => o.status === 'pending');
  const upNextOutlet = inProgressOutlet || nextPendingOutlet || null;

  const handleBack = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      onNavigateTab('summary');
    }
  };

  const handleOpenOutlet = (outlet: Outlet, index: number) => {
    setActiveOutletId(outlet.id);
    // If pending, mark as in_progress when driver opens it
    if (outlet.status === 'pending' && selectedRoute) {
      updateOutletStatus(selectedRoute.id, outlet.id, 'in_progress');
    }

    // Set active stop for MarketDetail
    const targetStop = stops[index % stops.length] || stops[0];
    if (targetStop) {
      setActiveStopId(targetStop.id);
      onOpenStop(targetStop.id);
    }
  };

  const handleFinishRoute = () => {
    onNavigateTab('summary');
  };

  if (overrideLoading) {
    return (
      <main
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
        }}
        className="w-full max-w-[390px] min-h-[844px] h-screen bg-bg flex flex-col justify-between relative shadow-2xl border-x border-hairline/40 select-none overflow-hidden pt-4"
      >
        <div className="flex-1 px-4 space-y-4 pt-2 overflow-hidden animate-pulse">
          <div className="h-8 w-36 bg-hairline/60 rounded-md" />
          <div className="h-4 w-28 bg-hairline/40 rounded-md" />
          <div className="h-4 w-48 bg-hairline/40 rounded-md" />
          <div className="h-1 w-full bg-hairline/50 rounded-full mt-3" />
          <div className="h-40 w-full bg-surface rounded-[20px] border border-hairline mt-4" />
          <div className="h-64 w-full bg-surface rounded-[20px] border border-hairline" />
        </div>
      </main>
    );
  }

  return (
    <main
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full max-w-[390px] min-h-[844px] h-screen bg-bg flex flex-col justify-between relative shadow-2xl border-x border-hairline/40 select-none overflow-hidden"
    >
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Scrollable Container for Header and Content */}
        <div className="flex-1 px-4 overflow-y-auto space-y-4 pt-3 pb-8">
          {/* ROUTE HEADER: Back button, Route X title with "Map ›" accent button, brand, summary, progress bar, Signal row */}
          <RouteHeader
            routeNumber={selectedRoute ? selectedRoute.routeNumber : 1}
            brandName={selectedRoute ? selectedRoute.brandName : 'Fresh Mart'}
            totalOutlets={outlets.length}
            completedOutlets={completedCount}
            distanceKm={selectedRoute ? selectedRoute.distanceKm : 42}
            networkStatus={overrideOffline ? 'offline' : 'good'}
            gpsStatus={gpsStatus}
            onBack={handleBack}
            showBackButton={true}
            driverName={driverName}
            shiftElapsed="6h 12m"
            isOnline={shiftStatus === 'online'}
            onToggleShift={toggleShiftStatus}
            onOpenMap={() => onNavigateTab('map')}
          />

          {/* Up Next Card */}
          <UpNextCard
            outlet={upNextOutlet}
            allCompleted={allOutletsCompleted}
            onOpen={(o) => handleOpenOutlet(o, outlets.findIndex((out) => out.id === o.id))}
          />

          {/* All Outlets Inset Grouped Card */}
          <OutletListCard
            outlets={outlets}
            onOpenOutlet={(o, idx) => handleOpenOutlet(o, idx)}
          />
        </div>
      </div>

      {/* BOTTOM AREA: Finish SwipeBar only when ALL outlets are completed */}
      {allOutletsCompleted && (
        <footer className="w-full bg-surface border-t border-hairline pt-2 pb-6 px-1 flex flex-col gap-2 shrink-0 z-30">
          <SwipeBar
            selectedRouteNumber={selectedRoute ? selectedRoute.routeNumber : 1}
            isReadyOverride={true}
            placeholderText="Complete all outlets to finish"
            readyText={`Swipe to finish Route ${selectedRoute ? selectedRoute.routeNumber : 1}`}
            hideKnobWhenDisabled={true}
            onComplete={handleFinishRoute}
          />
        </footer>
      )}
    </main>
  );
};
