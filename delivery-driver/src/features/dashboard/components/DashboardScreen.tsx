// src/features/dashboard/components/DashboardScreen.tsx - Route Dashboard main screen

import React, { useEffect } from 'react';
import { useStore } from '@/state/store';
import { TopBar, SwipeBar } from '@/shared/components/ui';
import { Outlet } from '@/shared/types';
import { RouteHeader } from './RouteHeader';
import { UpNextCard } from './UpNextCard';
import { StopTimeline } from './StopTimeline';
import { NoticesPanel } from '@/features/notices/NoticesPanel';

export const DashboardScreen: React.FC = () => {
  const {
    selectedRoute,
    activeOutlet,
    setActiveOutletId,
    setReturnTo,
    pushScreen,
    replaceScreen,
    popScreen,
    historyStack,
    setLoginStage,
    completedOutletsCount,
    totalOutletsCount,
    allOutletsCompleted,
    upNextOutlet,
    whyOutletLocked,
    showToast,
    conditions,
    track
  } = useStore();

  useEffect(() => {
    track('D01');
  }, [track]);

  if (!selectedRoute) return null;

  const handleBack = () => {
    track('D05');
    track('G03');
    setLoginStage('stageB');
    if (historyStack.length > 1) {
      popScreen();
    } else {
      replaceScreen('login');
    }
  };

  const handleOpenMarket = (outlet: Outlet) => {
    if (outlet.status === 'completed') return;
    // Stops are worked in sequence: only the next one can be opened.
    const locked = whyOutletLocked(outlet.id);
    if (locked) {
      showToast(locked);
      return;
    }
    setActiveOutletId(outlet.id);
    setReturnTo('dashboard');

    if (outlet.unpackingComplete) {
      track('D03');
      pushScreen('pin_confirmation');
    } else {
      track('D03');
      pushScreen('market_detail');
    }
  };

  const handleOpenUpNext = () => {
    if (!upNextOutlet) return;
    setActiveOutletId(upNextOutlet.id);
    setReturnTo('dashboard');
    track('D02');
    if (upNextOutlet.unpackingComplete) {
      pushScreen('pin_confirmation');
    } else {
      pushScreen('market_detail');
    }
  };

  const handleOpenMap = () => {
    track('D04');
    pushScreen('map');
  };

  // Finishing the route needs the end meter photo (and the server's finish), then the summary.
  const handleFinishRoute = () => {
    track('D07');
    replaceScreen('meter_photo_end');
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none">
      <TopBar
        title="Fleet Logistics"
        showBackButton={true}
        onBack={handleBack}
      />

      {/* Main Content Area */}
      <div
        className="flex-1 px-4 overflow-y-auto space-y-4 pt-1"
        style={{ paddingBottom: 'max(32px, calc(16px + env(safe-area-inset-bottom, 0px)))' }}
      >
        {conditions.trackingDegraded && (
          <div role="alert" className="w-full rounded-[14px] border border-attention/50 bg-attention/15 px-4 py-3 text-[14px] leading-snug text-black dark:text-white">
            <strong className="font-semibold">Tracking degraded.</strong> {conditions.trackingReason || 'Location tracking is not working.'}
          </div>
        )}

        <NoticesPanel />

        <RouteHeader
          route={selectedRoute}
          totalOutletsCount={totalOutletsCount}
          completedOutletsCount={completedOutletsCount}
          allOutletsCompleted={allOutletsCompleted}
          conditions={conditions}
          onOpenMap={handleOpenMap}
        />

        <UpNextCard
          upNextOutlet={upNextOutlet}
          allOutletsCompleted={allOutletsCompleted}
          onOpenUpNext={handleOpenUpNext}
        />

        <StopTimeline
          outlets={selectedRoute.outlets}
          totalOutletsCount={totalOutletsCount}
          onOpenMarket={handleOpenMarket}
        />
      </div>

      {/* Finish Route SwipeBar */}
      {allOutletsCompleted && (
        <footer
          className="w-full bg-surface border-t border-hairline pt-2 px-1 flex flex-col gap-2 shrink-0 z-30 animate-row-enter"
          style={{ paddingBottom: 'max(24px, calc(10px + env(safe-area-inset-bottom, 0px)))' }}
        >
          <SwipeBar
            selectedRouteNumber={selectedRoute.routeNumber}
            isReadyOverride={true}
            readyText={`Swipe to finish Route ${selectedRoute.routeNumber}`}
            onComplete={handleFinishRoute}
          />
        </footer>
      )}
    </div>
  );
};
