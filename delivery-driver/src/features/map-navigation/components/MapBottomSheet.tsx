// src/features/map-navigation/components/MapBottomSheet.tsx - Bottom sheet / side panel for map navigation

import React from 'react';
import { Outlet, RoutePlan, PrototypeConditions } from '@/shared/types';
import { SignalIndicator } from '@/shared/components/ui';

export interface MapBottomSheetProps {
  selectedRoute: RoutePlan;
  outlets: Outlet[];
  currentMapOutlet: Outlet;
  upNextOutlet: Outlet | null;
  allOutletsCompleted: boolean;
  isCompletedOutlet: boolean;
  isInProgressOutlet: boolean;
  isArrived: boolean;
  conditions: PrototypeConditions;
  completedCount: number;
  onPopScreen: () => void;
  onPinTap: (outlet: Outlet) => void;
  onDirections: (e: React.MouseEvent) => void;
  onOpenOutlet: (e: React.MouseEvent) => void;
  onFinishRoute: () => void;
  onTurnOnGps: () => void;
}

export const MapBottomSheet: React.FC<MapBottomSheetProps> = ({
  selectedRoute,
  outlets,
  currentMapOutlet,
  upNextOutlet,
  allOutletsCompleted,
  isCompletedOutlet,
  isInProgressOutlet,
  isArrived,
  conditions,
  completedCount,
  onPopScreen,
  onPinTap,
  onDirections,
  onOpenOutlet,
  onFinishRoute,
  onTurnOnGps
}) => {
  const isSignalDegraded =
    conditions.networkStatus === 'weak' ||
    conditions.networkStatus === 'offline' ||
    conditions.gpsStatus === 'off' ||
    conditions.gpsQuality === 'weak';

  return (
    <>
      {/* Tablet Landscape Side Panel (>= 768px) */}
      <div className="hidden md:flex absolute top-4 left-4 bottom-4 w-[380px] z-20 pointer-events-auto flex-col select-none">
        <div className="w-full h-full bg-surface/95 dark:bg-[#141D45]/95 backdrop-blur-xl border border-hairline rounded-[24px] shadow-2xl flex flex-col overflow-hidden">
          <div className="p-4 pb-3 border-b border-hairline flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={onPopScreen}
                aria-label="Back to dashboard"
                className="w-9 h-9 rounded-full bg-surface border border-hairline flex items-center justify-center text-text-primary hover:bg-hairline/20 active:scale-95 transition-transform cursor-pointer focus:outline-none"
              >
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
              </button>
              <div>
                <h1 className="text-[17px] font-bold text-black dark:text-white leading-tight">
                  Route {selectedRoute.routeNumber}
                </h1>
                <p className="text-[12px] font-medium text-secondary">
                  {completedCount} of {outlets.length} stops completed · {selectedRoute.distanceKm} km
                </p>
              </div>
            </div>

            <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
              allOutletsCompleted ? 'bg-success/15 text-success' : 'bg-action/10 text-action'
            }`}>
              {allOutletsCompleted ? 'Complete' : 'Live Run'}
            </span>
          </div>

          {isSignalDegraded && (
            <div className="px-4 py-2 border-b border-hairline bg-attention/10 text-attention flex items-center gap-2">
              <SignalIndicator
                networkStatus={conditions.networkStatus}
                gpsStatus={conditions.gpsStatus}
                gpsQuality={conditions.gpsQuality}
                showHelperAlways={false}
              />
            </div>
          )}

          {allOutletsCompleted ? (
            <div className="p-5 flex-1 flex flex-col justify-center items-center text-center">
              <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mb-3">
                <span className="material-symbols-outlined text-[34px]">task_alt</span>
              </div>
              <h2 className="text-[20px] font-bold text-black dark:text-white">All Stops Delivered!</h2>
              <p className="text-[14px] text-secondary mt-1 mb-6 max-w-[280px]">
                All {outlets.length} outlets on Route {selectedRoute.routeNumber} have been completed and verified.
              </p>

              <button
                type="button"
                onClick={onFinishRoute}
                className="w-full h-14 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-semibold text-[16px] flex items-center justify-center shadow-lg transition-all cursor-pointer focus:outline-none"
              >
                <span>Finish Route & Review Summary</span>
                <span className="material-symbols-outlined ml-1.5 text-[20px]">arrow_forward</span>
              </button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto flex flex-col">
              <div className="p-4 bg-surface/60 border-b border-hairline">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[12px] font-semibold text-action uppercase tracking-wide">
                    {isArrived ? 'At Dock' : currentMapOutlet.id === upNextOutlet?.id ? 'Up Next' : `Stop ${currentMapOutlet.visitOrder} of ${outlets.length}`}
                  </span>
                  <span className="text-[12px] font-mono tabular-nums text-secondary font-medium">
                    {isArrived ? '≈ 80 m away' : '≈ 1.2 km away'}
                  </span>
                </div>

                <h2 className="text-[20px] font-bold text-black dark:text-white tracking-tight">
                  {currentMapOutlet.city}
                </h2>

                <div className="flex items-center gap-2 mt-1 text-[13px] text-secondary">
                  <span>{currentMapOutlet.itemCount} packages</span>
                  <span>•</span>
                  {currentMapOutlet.managerName ? <span>{currentMapOutlet.managerName}</span> : null}
                  {currentMapOutlet.managerPhone ? (
                    <a
                      href={`tel:${currentMapOutlet.managerPhone}`}
                      className="ml-auto inline-flex items-center gap-1 text-action hover:underline text-[12px] font-semibold"
                    >
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      <span>Call</span>
                    </a>
                  ) : null}
                </div>

                {!isCompletedOutlet && (
                  <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                    <button
                      type="button"
                      onClick={onDirections}
                      className="h-12 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1.5 border border-hairline bg-surface text-black dark:text-white hover:bg-hairline/20 active:scale-95 transition-all cursor-pointer focus:outline-none"
                    >
                      <span className="material-symbols-outlined text-[18px]">navigation</span>
                      <span>Directions</span>
                    </button>

                    <button
                      type="button"
                      onClick={onOpenOutlet}
                      className="h-12 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1 bg-action hover:bg-action/90 active:scale-95 text-white shadow-sm transition-all cursor-pointer focus:outline-none"
                    >
                      <span>{isInProgressOutlet ? 'Resume' : 'Open Delivery'}</span>
                      <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                <div className="px-3 py-1.5 text-[11px] font-semibold text-secondary uppercase tracking-wider">
                  Full Route Sequence ({outlets.length} Stops)
                </div>
                <div className="space-y-1">
                  {outlets.map((o) => {
                    const isSel = o.id === currentMapOutlet.id;
                    const isDone = o.status === 'completed';
                    const isInProg = o.status === 'in_progress';

                    return (
                      <div
                        key={o.id}
                        onClick={() => onPinTap(o)}
                        className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                          isSel
                            ? 'bg-action/10 border border-action/30'
                            : 'hover:bg-hairline/20 border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
                            isDone
                              ? 'bg-success text-white'
                              : isInProg
                              ? 'bg-action text-white'
                              : 'bg-surface border border-hairline text-secondary'
                          }`}>
                            {isDone ? '✓' : o.visitOrder}
                          </span>
                          <span className="text-[14px] font-medium text-black dark:text-white truncate">
                            {o.city}
                          </span>
                        </div>

                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                          isDone
                            ? 'bg-success/15 text-success'
                            : isInProg
                            ? 'bg-action/15 text-action'
                            : 'bg-hairline/30 text-secondary'
                        }`}>
                          {isDone ? 'Done' : isInProg ? 'Active' : `${o.itemCount} pkgs`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Portrait Bottom Card */}
      <div
        className="md:hidden absolute left-3 right-3 z-30 pointer-events-auto select-none"
        style={{ bottom: 'max(12px, env(safe-area-inset-bottom, 0px))' }}
      >
        {allOutletsCompleted ? (
          <div className="w-full bg-surface border border-hairline rounded-[20px] p-4 shadow-2xl flex flex-col items-center text-center">
            <div className="flex items-center gap-2 mb-1 text-success font-semibold text-[15px]">
              <span className="material-symbols-outlined text-[20px]">task_alt</span>
              <span>All {outlets.length} Stops Delivered</span>
            </div>
            <p className="text-[13px] text-secondary mb-3">Route {selectedRoute.routeNumber} complete</p>

            <button
              type="button"
              onClick={onFinishRoute}
              className="w-full h-12 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-semibold text-[15px] flex items-center justify-center shadow-md transition-all cursor-pointer focus:outline-none"
            >
              <span>Finish Route</span>
              <span className="material-symbols-outlined ml-1.5 text-[18px]">arrow_forward</span>
            </button>
          </div>
        ) : (
          <div className="w-full bg-surface border border-hairline rounded-[20px] p-3.5 shadow-2xl select-none">
            <div className="flex items-center justify-between min-h-[18px]">
              <div className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  isCompletedOutlet ? 'bg-success' : isInProgressOutlet ? 'bg-action' : 'bg-pending'
                }`} />
                <span className="text-[13px] font-semibold text-secondary">
                  {isArrived
                    ? "You've arrived"
                    : currentMapOutlet.id === upNextOutlet?.id
                    ? 'Up next'
                    : `Stop ${currentMapOutlet.visitOrder} of ${outlets.length}`}
                </span>
              </div>

              <span className="text-[13px] font-mono tabular-nums text-secondary font-medium">
                {isArrived ? '≈ 80 m away' : '≈ 1.2 km away'}
              </span>
            </div>

            <h2 className="text-[20px] font-bold text-black dark:text-white tracking-tight mt-0.5 truncate">
              {currentMapOutlet.city}
            </h2>

            <div className="flex items-center gap-2 mt-0.5 text-[13px] text-secondary">
              <span>{currentMapOutlet.itemCount} items</span>
              <span>•</span>
              {currentMapOutlet.managerName ? <span>{currentMapOutlet.managerName}</span> : null}
              {currentMapOutlet.managerPhone ? (
                <a
                  href={`tel:${currentMapOutlet.managerPhone}`}
                  className="ml-auto inline-flex items-center gap-1 text-action hover:underline text-[12px] font-semibold"
                >
                  <span className="material-symbols-outlined text-[14px]">call</span>
                  <span>Call</span>
                </a>
              ) : null}
            </div>

            {conditions.gpsStatus === 'off' && !isCompletedOutlet && (
              <div className="mt-2 text-[12px] text-secondary flex items-center justify-between">
                <span>GPS is off</span>
                <button
                  type="button"
                  onClick={onTurnOnGps}
                  className="font-semibold text-action cursor-pointer hover:underline"
                >
                  Enable
                </button>
              </div>
            )}

            {!isCompletedOutlet && (
              <div className="grid grid-cols-2 gap-2 mt-3">
                <button
                  type="button"
                  onClick={onDirections}
                  className="h-11 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1 border border-hairline bg-surface text-black dark:text-white hover:bg-hairline/20 active:scale-95 transition-all cursor-pointer focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[17px]">navigation</span>
                  <span>Directions</span>
                </button>

                <button
                  type="button"
                  onClick={onOpenOutlet}
                  className="h-11 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1 bg-action hover:bg-action/90 active:scale-95 text-white shadow-sm transition-all cursor-pointer focus:outline-none"
                >
                  <span>{isInProgressOutlet ? 'Resume' : 'Open'}</span>
                  <span className="material-symbols-outlined text-[17px]">chevron_right</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
};
