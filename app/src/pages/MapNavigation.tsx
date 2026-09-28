import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useRoute, Outlet } from '../state/routeContext';
import { useDriverPosition } from '../hooks/useDriverPosition';
import { TopBar } from '../components/TopBar';
import { RoutePill } from '../components/RoutePill';
import { RecenterButton } from '../components/RecenterButton';
import { NavOutletCard } from '../components/NavOutletCard';
import { NavMap } from '../components/NavMap';
import { SwipeBar } from '../components/SwipeBar';

export interface MapNavigationProps {
  onBack: () => void;
  onOpenMarketDetail: (stopId: number) => void;
  onFinishRoute: () => void;
  // Overrides for testing / preview frames
  overrideState?:
    | 'default'
    | 'pin_selected'
    | 'arrived'
    | 'in_progress'
    | 'completed_outlet'
    | 'route_complete'
    | 'gps_off'
    | 'offline'
    | 'loading';
  overrideOutlets?: Outlet[];
}

export const MapNavigation: React.FC<MapNavigationProps> = ({
  onBack,
  onOpenMarketDetail,
  onFinishRoute,
  overrideState,
  overrideOutlets
}) => {
  const {
    routes,
    selectedRouteId,
    stops,
    setActiveStopId,
    setActiveOutletId,
    updateOutletStatus,
    mapView,
    setMapView
  } = useRoute();

  const {
    driverPosition: realDriverPos,
    gpsStatus: realGpsStatus,
    requestGps
  } = useDriverPosition();

  // Active route
  const effectiveRouteId = selectedRouteId ?? (routes.length > 0 ? routes[0].id : 1);
  const selectedRoute = routes.find((r) => r.id === effectiveRouteId) || routes[0];

  // Route Outlets
  const outlets: Outlet[] = useMemo(() => {
    if (overrideOutlets) return overrideOutlets;
    const base = selectedRoute?.outlets || [];

    if (overrideState === 'route_complete') {
      return base.map((o) => ({ ...o, status: 'completed' as const }));
    }
    return base;
  }, [selectedRoute, overrideOutlets, overrideState]);

  // Derived statuses
  const allOutletsCompleted = useMemo(() => {
    return outlets.length > 0 && outlets.every((o) => o.status === 'completed');
  }, [outlets]);

  // Up next outlet (in_progress first, or first pending)
  const upNextOutlet = useMemo(() => {
    return outlets.find((o) => o.status === 'in_progress') || outlets.find((o) => o.status === 'pending') || outlets[0];
  }, [outlets]);

  // Selected outlet state
  const [selectedOutletId, setSelectedOutletId] = useState<string | null>(() => {
    if (overrideState === 'completed_outlet') {
      const completed = outlets.find((o) => o.status === 'completed');
      return completed?.id || outlets[0]?.id || null;
    }
    if (overrideState === 'in_progress') {
      const inProg = outlets.find((o) => o.status === 'in_progress');
      return inProg?.id || outlets[0]?.id || null;
    }
    if (overrideState === 'pin_selected') {
      // Pick another pending outlet (e.g. outlet 5 or 6)
      const another = outlets.find((o) => o.status === 'pending' && o.id !== upNextOutlet?.id);
      return another?.id || outlets[1]?.id || null;
    }
    if (mapView?.selectedOutletId) {
      return mapView.selectedOutletId;
    }
    return upNextOutlet?.id || outlets[0]?.id || null;
  });

  const selectedOutlet = useMemo(() => {
    return outlets.find((o) => o.id === selectedOutletId) || upNextOutlet || outlets[0];
  }, [outlets, selectedOutletId, upNextOutlet]);

  const [isNavigating, setIsNavigating] = useState(false);

  // Sri Lankan central route turn-by-turn guidance generator
  const currentManeuver = useMemo(() => {
    const isArrived = overrideState === 'arrived';
    if (isArrived) {
      return {
        icon: 'check_circle',
        distanceText: '10 m',
        instruction: `Arrived at ${selectedOutlet.city}`,
        nextStep: 'Park in designated commercial delivery bay',
        etaMinutes: 0,
        distanceKm: 0.1
      };
    }

    const cityGuidance: Record<
      string,
      { icon: string; distanceText: string; instruction: string; nextStep: string; etaMinutes: number; distanceKm: number }
    > = {
      Peradeniya: {
        icon: 'turn_left',
        distanceText: '350 m',
        instruction: 'Turn left onto Peradeniya Rd / A1',
        nextStep: 'Then 1.4 km straight along A1 corridor',
        etaMinutes: 6,
        distanceKm: 2.8
      },
      Katugastota: {
        icon: 'turn_right',
        distanceText: '500 m',
        instruction: 'Turn right onto Kurunegala Rd across Katugastota Bridge',
        nextStep: 'Then follow Kurunegala Rd / A10 for 2.1 km',
        etaMinutes: 9,
        distanceKm: 4.1
      },
      Gampola: {
        icon: 'straight',
        distanceText: '750 m',
        instruction: 'Continue straight on Kandy - Gampola Hwy / AB13',
        nextStep: 'Then stay on AB13 south toward Gampola clock tower',
        etaMinutes: 14,
        distanceKm: 8.6
      },
      Kundasale: {
        icon: 'turn_slight_right',
        distanceText: '250 m',
        instruction: 'Bear right onto Digana - Kandy Rd / A26',
        nextStep: 'Then 3.2 km past Pallekele International Stadium',
        etaMinutes: 11,
        distanceKm: 5.4
      }
    };

    return (
      cityGuidance[selectedOutlet.city] || {
        icon: 'turn_right',
        distanceText: '350 m',
        instruction: `Turn right onto William Gopallawa Mawatha toward ${selectedOutlet.city}`,
        nextStep: `Then follow A1 toward ${selectedOutlet.city} for 1.8 km`,
        etaMinutes: 8,
        distanceKm: 3.2
      }
    );
  }, [selectedOutlet, overrideState]);

  // Recenter trigger counter
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  // Bottom card height tracking for attribution offset
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [cardHeight, setCardHeight] = useState(140);

  useEffect(() => {
    if (!cardContainerRef.current) return;
    const el = cardContainerRef.current;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const height = entry.contentRect.height;
        if (height > 0) {
          setCardHeight(height);
          document.documentElement.style.setProperty('--bottom-card-height', `${height}px`);
        }
      }
    });

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Position & GPS overrides for preview frames
  const gpsStatus = useMemo(() => {
    if (overrideState === 'gps_off') return 'off';
    return realGpsStatus;
  }, [overrideState, realGpsStatus]);

  const driverPosition = useMemo(() => {
    if (overrideState === 'gps_off') return null;
    if (overrideState === 'arrived' && selectedOutlet?.lat != null && selectedOutlet?.lng != null) {
      // ~80 meters from selected outlet
      return {
        lat: selectedOutlet.lat + 0.0006,
        lng: selectedOutlet.lng + 0.0005,
        accuracyMeters: 10
      };
    }
    return realDriverPos;
  }, [overrideState, selectedOutlet, realDriverPos]);

  // Open MarketDetail handler with returnTo='map'
  const handleOpenMarketDetail = useCallback(
    (outlet: Outlet) => {
      setActiveOutletId(outlet.id);

      if (outlet.status === 'pending' && selectedRoute) {
        updateOutletStatus(selectedRoute.id, outlet.id, 'in_progress');
      }

      // Map to stop index
      const outletIdx = outlets.findIndex((o) => o.id === outlet.id);
      const targetStop = stops[outletIdx % stops.length] || stops[0];
      if (targetStop) {
        setActiveStopId(targetStop.id);
        onOpenMarketDetail(targetStop.id);
      }
    },
    [outlets, selectedRoute, stops, setActiveOutletId, updateOutletStatus, setActiveStopId, onOpenMarketDetail]
  );

  const handleRecenter = useCallback(() => {
    setSelectedOutletId(null);
    setRecenterTrigger((prev) => prev + 1);
  }, []);

  // Loading skeleton state
  if (overrideState === 'loading') {
    return (
      <main
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
        }}
        className="w-full max-w-[390px] h-screen bg-bg flex flex-col relative select-none overflow-hidden"
      >
        <TopBar title="Fleet Logistics" showBackButton={true} onBack={onBack} isScrolled={false} />
        <div className="flex-1 relative bg-surface animate-pulse flex flex-col justify-between p-4">
          <div className="flex justify-between items-center">
            <div className="h-8 w-32 rounded-full bg-hairline/60" />
            <div className="w-11 h-11 rounded-full bg-hairline/60" />
          </div>
          <div className="mx-0 mb-4 h-36 rounded-[16px] bg-surface border border-hairline p-4 space-y-3">
            <div className="h-4 w-28 rounded bg-hairline/60" />
            <div className="h-7 w-40 rounded bg-hairline/80" />
            <div className="h-4 w-32 rounded bg-hairline/50" />
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div className="h-12 rounded-lg bg-hairline/60" />
              <div className="h-12 rounded-lg bg-hairline/60" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  const isOffline = overrideState === 'offline';
  const networkStatus = isOffline ? 'offline' : 'good';

  return (
    <main
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full max-w-[390px] h-[100dvh] bg-bg flex flex-col relative select-none overflow-hidden"
    >
      {/* 1. TopBar (44px, centered title, back chevron on left, solid page bg, no hairline) */}
      <TopBar
        title="Fleet Logistics"
        showBackButton={true}
        onBack={onBack}
        isScrolled={false}
      />

      {/* 2. Map Area (fills below TopBar down to physical bottom edge) */}
      <div className="flex-1 min-h-0 relative isolation-isolate z-0 overflow-hidden">
        <NavMap
          outlets={outlets}
          selectedOutletId={selectedOutletId}
          onSelectOutlet={setSelectedOutletId}
          driverPosition={driverPosition}
          gpsStatus={gpsStatus}
          mapView={mapView}
          onSaveMapView={setMapView}
          bottomCardHeight={cardHeight}
          recenterTrigger={recenterTrigger}
          isOffline={isOffline}
        />

        {/* 3a/b. Top Overlay: Either In-App Turn-by-Turn Banner OR RoutePill + Recenter */}
        {isNavigating ? (
          <div className="absolute top-3 left-3 right-3 z-[1000] animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-full bg-surface/90 backdrop-blur-xl rounded-[20px] border border-hairline/80 p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-none select-none">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Apple Maneuver Icon Badge */}
                  <div className="w-11 h-11 rounded-[14px] bg-action/10 text-action flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[26px]">
                      {currentManeuver.icon}
                    </span>
                  </div>

                  {/* Distance & Turn Instruction */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[20px] font-bold text-text-primary tracking-tight font-mono tabular-nums leading-none">
                        {currentManeuver.distanceText}
                      </span>
                      <span className="text-[11px] font-semibold text-action uppercase tracking-wider">
                        Next Turn
                      </span>
                    </div>
                    <p className="text-[13px] text-text-primary font-medium leading-tight mt-1 line-clamp-1">
                      {currentManeuver.instruction}
                    </p>
                  </div>
                </div>

                {/* Minimal Dismiss / Exit Button */}
                <button
                  type="button"
                  onClick={() => setIsNavigating(false)}
                  aria-label="Exit in-app navigation"
                  className="w-8 h-8 rounded-full bg-hairline/50 hover:bg-hairline text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Secondary Upcoming Maneuver Preview */}
              <div className="mt-2.5 pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px] text-text-secondary">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="material-symbols-outlined text-[14px] text-text-secondary/70 shrink-0">
                    straight
                  </span>
                  <span className="truncate">{currentManeuver.nextStep}</span>
                </div>
                <span className="font-mono tabular-nums text-text-secondary/80 shrink-0 ml-2">
                  {currentManeuver.etaMinutes} min
                </span>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* 3a. Route Pill: Top-left overlay */}
            <div className="absolute top-3 left-3 z-[1000]">
              <RoutePill
                routeNumber={selectedRoute?.routeNumber ?? 2}
                distanceKm={selectedRoute?.distanceKm ?? 42}
              />
            </div>

            {/* 3b. Recenter Button: Top-right overlay */}
            <div className="absolute top-3 right-3 z-[1000]">
              <RecenterButton onRecenter={handleRecenter} />
            </div>
          </>
        )}

        {/* 3c. Bottom Area: Floating Card OR Finish SwipeBar */}
        <div
          ref={cardContainerRef}
          className="absolute bottom-4 left-0 right-0 z-[1000] pointer-events-none"
        >
          {allOutletsCompleted ? (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 pointer-events-auto"
            >
              <SwipeBar
                selectedRouteNumber={selectedRoute?.routeNumber ?? 2}
                isReadyOverride={true}
                readyText={`Swipe to finish Route ${selectedRoute?.routeNumber ?? 2}`}
                onComplete={onFinishRoute}
              />
            </div>
          ) : selectedOutlet ? (
            <NavOutletCard
              outlet={selectedOutlet}
              totalOutlets={outlets.length}
              isUpNext={selectedOutlet.id === upNextOutlet?.id}
              driverPosition={driverPosition}
              gpsStatus={gpsStatus}
              onRequestGps={requestGps}
              onOpenOutlet={handleOpenMarketDetail}
              networkStatus={networkStatus}
              isNavigating={isNavigating}
              onStartDirections={() => setIsNavigating(true)}
              onEndDirections={() => setIsNavigating(false)}
            />
          ) : null}
        </div>
      </div>
    </main>
  );
};
