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
            />
          ) : null}
        </div>
      </div>
    </main>
  );
};
