// app/src/components/screens/RouteDashboard.tsx - Screen 2: Route Dashboard

import React, { useEffect } from 'react';
import { useStore } from '../../state/store';
import { TopBar } from '../shared/TopBar';
import { SignalIndicator } from '../shared/SignalIndicator';
import { SwipeBar } from '../shared/SwipeBar';
import { Outlet } from '../../data/mock';

export const RouteDashboard: React.FC = () => {
  const {
    selectedRoute,
    selectRoute,
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

  const handleFinishRoute = () => {
    track('D07');
    replaceScreen('shift_summary');
  };

  const percentCompleted = totalOutletsCount > 0
    ? Math.min(100, Math.round((completedOutletsCount / totalOutletsCount) * 100))
    : 0;

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
        {/* Route Header (Entrance stagger: 0ms) */}
        <section
          aria-label="Route Overview Header"
          className="w-full px-1 pt-1 pb-1 select-none animate-row-enter"
          style={{ animationDelay: '0ms' }}
        >
          {/* Header Row: Title & Map button */}
          <div className="flex items-baseline justify-between">
            <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight">
              Route <span className="font-mono tabular-nums">{selectedRoute.routeNumber}</span>
            </h1>
            <button
              type="button"
              onClick={handleOpenMap}
              aria-label="Open route map"
              className="text-[17px] font-medium text-action hover:opacity-80 transition-opacity focus:outline-none cursor-pointer min-h-[44px] flex items-baseline pt-1 px-1 -mr-1"
            >
              Map ›
            </button>
          </div>

          {/* Subtitle */}
          <p className="text-[15px] text-secondary font-normal leading-tight mt-0.5">
            {selectedRoute.brandName} · Marcus Vance
          </p>

          {/* Metrics Summary */}
          <p className="text-[15px] text-secondary tabular-nums font-normal leading-normal mt-2">
            {totalOutletsCount} outlets · {selectedRoute.distanceKm} km
          </p>

          {/* Progress Bar (300ms transition) */}
          <div className="mt-3.5 space-y-1.5">
            <div
              role="progressbar"
              aria-valuenow={completedOutletsCount}
              aria-valuemin={0}
              aria-valuemax={totalOutletsCount}
              className="w-full h-1 bg-hairline/60 rounded-full overflow-hidden"
            >
              <div
                style={{ width: `${percentCompleted}%` }}
                className={`h-full rounded-full transition-all duration-300 ease-out ${
                  allOutletsCompleted ? 'bg-success' : 'bg-action'
                }`}
              />
            </div>
            <div className="flex items-center justify-between text-[13px] text-secondary tabular-nums font-normal">
              <span>
                {completedOutletsCount} of {totalOutletsCount} completed
              </span>
              <span className="font-mono text-[12px]">6h 12m elapsed</span>
            </div>
          </div>

          {/* Signal Indicator Row (D08) */}
          <div className="mt-3">
            <SignalIndicator
              networkStatus={conditions.networkStatus}
              gpsStatus={conditions.gpsStatus}
              gpsQuality={conditions.gpsQuality}
            />
          </div>
        </section>

        {/* Up Next Card (Entrance stagger: 40ms) */}
        <section
          aria-label="Up Next Card"
          className="w-full bg-surface rounded-[20px] border border-hairline p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none animate-row-enter transition-all duration-200"
          style={{ animationDelay: '40ms' }}
        >
          {allOutletsCompleted || !upNextOutlet ? (
            <div className="flex items-center gap-3.5 py-1">
              <div className="w-10 h-10 rounded-full bg-gps-tint flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[22px] text-success">
                  check_circle
                </span>
              </div>
              <div>
                <h2 className="text-[17px] font-semibold text-black dark:text-white tracking-tight">
                  All stops completed
                </h2>
                <p className="text-[13px] text-secondary mt-0.5">
                  Swipe the bar below to finish your route.
                </p>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold text-secondary uppercase tracking-wider block">
                  {upNextOutlet.status === 'in_progress' ? 'CURRENT OUTLET' : 'UP NEXT'}
                </span>
                {upNextOutlet.status === 'in_progress' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-action animate-pulse" />
                )}
              </div>

              <div className="flex items-center gap-2 mt-1">
                <span className="w-6 h-6 rounded-full bg-hairline/80 text-secondary dark:text-white text-[11px] font-bold font-mono flex items-center justify-center shrink-0">
                  {upNextOutlet.visitOrder}
                </span>
                <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight leading-snug truncate">
                  {upNextOutlet.city}
                </h2>
              </div>

              <p className="text-[15px] text-secondary font-normal mt-0.5 tabular-nums truncate">
                {upNextOutlet.itemCount} items to deliver · {upNextOutlet.managerName}
              </p>

              <button
                type="button"
                onClick={handleOpenUpNext}
                className="w-full h-12 mt-3.5 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-medium text-[16px] flex items-center justify-center gap-1.5 shadow-sm transition-all focus:outline-none cursor-pointer"
              >
                <span>{upNextOutlet.status === 'in_progress' ? 'Continue delivery' : 'Start delivery'}</span>
                <span className="material-symbols-outlined text-[18px]">chevron_right</span>
              </button>
            </div>
          )}
        </section>

        {/* Outlets List Card (Entrance stagger: 80ms) */}
        <section
          aria-label="All outlets in route"
          className="w-full bg-surface rounded-[20px] border border-hairline shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none overflow-hidden animate-row-enter"
          style={{ animationDelay: '80ms' }}
        >
          <div className="px-4 py-3.5 flex items-center justify-between border-b-[0.5px] border-hairline">
            <h3 className="text-[17px] font-semibold text-black dark:text-white tracking-tight leading-none">
              Outlets
            </h3>
            <span className="text-[15px] text-secondary font-mono tabular-nums font-normal">
              {totalOutletsCount}
            </span>
          </div>

          <div className="divide-y-[0.5px] divide-hairline">
            {selectedRoute.outlets.map((outlet, index) => {
              const isFirst = index === 0;
              const isLast = index === selectedRoute.outlets.length - 1;
              const isDone = outlet.status === 'completed';
              const isInProg = outlet.status === 'in_progress';

              return (
                <div
                  key={outlet.id}
                  onClick={() => !isDone && handleOpenMarket(outlet)}
                  className={`relative flex items-stretch min-h-[56px] transition-colors ${
                    isDone ? 'opacity-60 cursor-default' : 'hover:bg-bg/40 active:bg-bg/80 cursor-pointer'
                  }`}
                >
                  {/* Sequence Column */}
                  <div className="w-14 relative flex items-center justify-center shrink-0">
                    {!isFirst && (
                      <div className="absolute top-0 bottom-1/2 left-1/2 -translate-x-1/2 w-[1px] bg-hairline pointer-events-none" />
                    )}
                    {!isLast && (
                      <div className="absolute top-1/2 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-hairline pointer-events-none" />
                    )}
                    <div
                      className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-mono tabular-nums border transition-colors ${
                        isDone
                          ? 'bg-success/10 border-success/30 text-success'
                          : isInProg
                          ? 'bg-action/10 border-action/40 text-action font-semibold'
                          : 'bg-bg border-hairline text-secondary'
                      }`}
                    >
                      {index + 1}
                    </div>
                  </div>

                  {/* Outlet Details */}
                  <div className="flex-1 py-2.5 pr-4 flex items-center justify-between min-w-0">
                    <div className="min-w-0 pr-2">
                      <p className="text-[17px] font-medium text-black dark:text-white leading-tight truncate">
                        {outlet.city}
                      </p>
                      <p className="text-[13px] text-secondary font-normal mt-0.5 tabular-nums">
                        {outlet.itemCount} items
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-200 ${
                          isDone ? 'bg-success' : isInProg ? 'bg-action' : 'bg-secondary/40'
                        }`}
                      />
                      <span className="text-[13px] text-secondary font-normal transition-colors duration-200">
                        {isDone ? 'Completed' : isInProg ? 'In progress' : 'Pending'}
                      </span>
                      {!isDone && (
                        <span className="material-symbols-outlined text-[18px] text-secondary">
                          chevron_right
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* D07 Finish Route SwipeBar (rises 250ms when all completed) */}
      {allOutletsCompleted && (
        <footer className="w-full bg-surface border-t border-hairline pt-2 pb-6 px-1 flex flex-col gap-2 shrink-0 z-30 animate-row-enter">
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
