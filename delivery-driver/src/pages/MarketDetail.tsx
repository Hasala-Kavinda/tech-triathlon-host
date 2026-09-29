import React, { useState, useEffect, useRef } from 'react';
import { useRoute, Outlet, OutletProduct, defaultProducts } from '../state/routeContext';
import { useDriver } from '../state/driverContext';
import { TopBar } from '../components/TopBar';
import { OutletHeader } from '../components/OutletHeader';
import { ProgressBar } from '../components/ProgressBar';
import { SignalIndicator } from '../components/SignalIndicator';
import { ChecklistItem } from '../components/ChecklistItem';
import { PrimaryActionBar } from '../components/PrimaryActionBar';

interface MarketDetailProps {
  returnTo: 'dashboard' | 'map';
  onBack: () => void;
  onProceedToPin: (stopId: number) => void;
}

export const MarketDetail: React.FC<MarketDetailProps> = ({
  returnTo: _returnTo,
  onBack,
  onProceedToPin
}) => {
  const {
    routes,
    selectedRouteId,
    activeOutletId,
    activeOutlet,
    setActiveOutletId,
    toggleOutletProduct,
    setOutletUnpackingComplete,
    activeStop,
    markUnpackingComplete,
    setActiveStopId,
    stops
  } = useRoute();

  const { gpsStatus } = useDriver();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledFromTop, setIsScrolledFromTop] = useState(false);
  const [isScrolledUnderBottom, setIsScrolledUnderBottom] = useState(false);

  // Check URL parameters for simulated states (e.g. for previews/testing)
  const isOfflineSim =
    typeof window !== 'undefined' &&
    (window.location.search.includes('offline=true') || window.location.hash.includes('offline'));
  const isLoadingSim =
    typeof window !== 'undefined' &&
    (window.location.search.includes('loading=true') || window.location.hash.includes('loading'));

  // Resolve current outlet
  const route =
    routes.find((r) => r.outlets.some((o) => o.id === activeOutletId)) ||
    routes.find((r) => r.id === selectedRouteId) ||
    routes[1] ||
    routes[0];

  const outlet: Outlet | undefined =
    activeOutlet ||
    route?.outlets.find((o) => o.id === activeOutletId) ||
    route?.outlets[3] ||
    route?.outlets[0];

  // If no active outlet found at all, return gracefully
  useEffect(() => {
    if (!outlet) {
      onBack();
    }
  }, [outlet, onBack]);

  // Determine items and checked states
  const rawProducts = outlet?.products || defaultProducts;
  const isAlreadyCompleted = outlet?.unpackingComplete || outlet?.status === 'completed';
  const products: OutletProduct[] = isAlreadyCompleted
    ? rawProducts.map((p) => ({ ...p, checked: true }))
    : rawProducts;

  const totalCount = products.length;
  const unpackedCount = products.filter((p) => p.checked).length;
  const isAllChecked = totalCount > 0 && unpackedCount === totalCount;

  // Signal condition: ONLY show when Network or GPS is Weak or Offline
  // In driverContext, default gpsStatus is 'off' before starting, or 'strong' when active.
  const isNetworkOffline = isOfflineSim;
  const isGpsWeakOrOffline =
    gpsStatus === 'off' ||
    gpsStatus === 'unavailable' ||
    gpsStatus === 'blocked' ||
    gpsStatus === 'requesting';
  const showSignal = isNetworkOffline || isGpsWeakOrOffline;

  // Track scrolling for TopBar hairline and BottomBar hairline
  const updateScrollState = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    setIsScrolledFromTop(el.scrollTop > 4);

    const hasOverflow = el.scrollHeight > el.clientHeight;
    const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 4;
    setIsScrolledUnderBottom(hasOverflow && !isAtBottom);
  };

  useEffect(() => {
    updateScrollState();
  }, [products]);

  const handleScroll = () => {
    updateScrollState();
  };

  const handleToggleProduct = (productId: string) => {
    if (!outlet) return;
    toggleOutletProduct(outlet.id, productId);
  };

  const handleProceed = () => {
    if (!isAllChecked || !outlet) return;
    setOutletUnpackingComplete(outlet.id, true);
    setActiveOutletId(outlet.id);

    // Coordinate with PIN Confirmation
    const correspondingStop =
      activeStop ||
      stops.find((s) => s.name.toLowerCase().includes(outlet.city.toLowerCase())) ||
      stops[1] ||
      stops[0];

    if (correspondingStop) {
      setActiveStopId(correspondingStop.id);
      markUnpackingComplete(correspondingStop.id);
      onProceedToPin(correspondingStop.id);
    } else {
      onProceedToPin(2);
    }
  };

  if (isLoadingSim) {
    return (
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
        }}
        className="w-full max-w-[390px] min-h-[844px] h-screen bg-bg relative flex flex-col justify-between shadow-2xl border-x border-hairline/40 select-none overflow-hidden"
      >
        <TopBar title="Fleet Logistics" showBackButton={true} onBack={onBack} />
        <div className="flex-1 px-4 space-y-4 pt-3 overflow-hidden animate-pulse">
          <div className="h-4 w-32 bg-hairline/60 rounded" />
          <div className="h-8 w-44 bg-hairline/70 rounded-md" />
          <div className="h-4 w-24 bg-hairline/50 rounded" />
          <div className="h-5 w-56 bg-hairline/40 rounded mt-3" />
          <div className="h-1 w-full bg-hairline/40 rounded-full mt-2" />
          <div className="h-4 w-28 bg-hairline/40 rounded mt-1" />
          <div className="mt-4 bg-surface rounded-[20px] border border-hairline divide-y divide-hairline overflow-hidden">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-14 px-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-[26px] h-[26px] rounded-full bg-hairline/50" />
                  <div className="h-4 w-32 bg-hairline/40 rounded" />
                </div>
                <div className="h-4 w-16 bg-hairline/30 rounded" />
              </div>
            ))}
          </div>
        </div>
        <footer className="w-full bg-bg px-4 pt-3 pb-8 border-t border-hairline/20">
          <div className="w-full h-[56px] rounded-[8px] bg-hairline/30" />
        </footer>
      </div>
    );
  }

  if (!outlet) {
    return null;
  }

  const outletIndex = route?.outlets.findIndex((o) => o.id === outlet.id) ?? -1;
  const outletOrder = outletIndex >= 0 ? outletIndex + 1 : outlet.visitOrder || 4;
  const totalOutlets = route?.outlets.length || 14;

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full max-w-[390px] min-h-[844px] h-screen bg-bg relative flex flex-col justify-between shadow-2xl border-x border-hairline/40 select-none overflow-hidden"
    >
      {/* 1. TopBar (title centered, back chevron returns to where driver came from) */}
      <TopBar
        title="Fleet Logistics"
        showBackButton={true}
        onBack={onBack}
        isScrolled={isScrolledFromTop}
      />

      {/* 2. Main Scrollable Content */}
      <main
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 px-4 space-y-4 pt-2 overflow-y-auto pb-4"
      >
        {/* Outlet Header */}
        <OutletHeader
          routeNumber={route?.routeNumber || 2}
          outletOrder={outletOrder}
          totalOutlets={totalOutlets}
          city={outlet.city}
          brandName={route?.brandName || 'Waypoint'}
          managerName={outlet.managerName || 'Nuwan Perera'}
          managerPhone={outlet.managerPhone || '077 123 4567'}
        />

        {/* Progress Bar */}
        <ProgressBar unpackedCount={unpackedCount} totalCount={totalCount} />

        {/* Signal Row: shown ONLY when Network or GPS is Weak or Offline */}
        {showSignal && (
          <div className="pt-0.5">
            <SignalIndicator
              networkStatus={isNetworkOffline ? 'offline' : 'good'}
              gpsStatus={gpsStatus}
            />
          </div>
        )}

        {/* Checklist (Unpacking): Inset Grouped Card */}
        <section aria-label="Unpacking checklist" className="w-full pt-1">
          <div className="bg-surface rounded-[20px] border border-hairline divide-y divide-hairline overflow-hidden shadow-sm">
            {products.map((product) => (
              <ChecklistItem
                key={product.id}
                product={product}
                onToggle={handleToggleProduct}
              />
            ))}
          </div>
        </section>
      </main>

      {/* 3. Bottom Action Bar */}
      <PrimaryActionBar
        unpackedCount={unpackedCount}
        totalCount={totalCount}
        isScrolled={isScrolledUnderBottom}
        onProceed={handleProceed}
      />
    </div>
  );
};
