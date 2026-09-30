// src/features/auth/components/RoutePlanCard.tsx - Today's Plan accordion card

import React from 'react';
import { RoutePlan } from '@/shared/types';

export interface RoutePlanCardProps {
  routes: RoutePlan[];
  selectedRouteId: number | null;
  expandedRouteId: number | null;
  inProgressRoute?: RoutePlan;
  dateFormatted: string;
  totalRoutes: number;
  totalOutlets: number;
  totalDistance: number;
  onToggleExpand: (routeId: number) => void;
  onStartOrClear: (routeId: number) => void;
  onTrackScroll: () => void;
}

export const RoutePlanCard: React.FC<RoutePlanCardProps> = ({
  routes,
  selectedRouteId,
  expandedRouteId,
  inProgressRoute,
  dateFormatted,
  totalRoutes,
  totalOutlets,
  totalDistance,
  onToggleExpand,
  onStartOrClear,
  onTrackScroll
}) => {
  return (
    <section
      aria-label="Today's Plan"
      className="w-full bg-surface rounded-[20px] border border-hairline p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none animate-row-enter"
      style={{ animationDelay: '40ms' }}
    >
      <div className="flex items-baseline justify-between">
        <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white leading-none">
          Today's Plan
        </h2>
        <span className="text-[15px] text-secondary tabular-nums font-normal">
          {dateFormatted}
        </span>
      </div>

      <div className="mt-1.5 text-[15px] text-secondary tabular-nums font-normal leading-normal">
        {totalRoutes} routes · {totalOutlets} outlets · {totalDistance} km
      </div>

      {/* Routes List */}
      <div className="mt-2 divide-y-[0.5px] divide-hairline">
        {routes.map((route) => {
          const isExpanded = expandedRouteId === route.id;
          const isSelected = selectedRouteId === route.id;
          const isInProg = route.status === 'in_progress';
          const isDone = route.status === 'completed';
          const otherRouteInProgress = inProgressRoute && inProgressRoute.id !== route.id;

          return (
            <div key={route.id} className="transition-colors duration-150">
              {/* Accordion header button */}
              <button
                type="button"
                onClick={() => onToggleExpand(route.id)}
                className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
              >
                <div className="flex items-baseline gap-2 min-w-0 pr-2">
                  <span
                    className={`text-[17px] font-medium tracking-tight ${
                      isSelected ? 'text-action font-semibold' : 'text-black dark:text-white'
                    }`}
                  >
                    Route {route.routeNumber}
                  </span>
                  <span className="text-[15px] text-secondary tabular-nums font-normal truncate">
                    {route.outlets.length} outlets · {route.distanceKm} km
                    {isSelected && (
                      <span className="ml-1.5 inline-flex items-center font-medium text-action">
                        · Selected
                      </span>
                    )}
                    {isInProg && (
                      <span className="ml-1.5 inline-flex items-center font-medium text-action">
                        · In Progress
                      </span>
                    )}
                    {isDone && (
                      <span className="ml-1.5 inline-flex items-center font-medium text-success">
                        · Completed
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 shrink-0 pl-2">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      isDone ? 'bg-success' : isInProg ? 'bg-action' : 'bg-pending'
                    }`}
                  />
                  <span
                    className={`material-symbols-outlined text-[20px] transition-transform duration-300 transform select-none ${
                      isExpanded ? 'rotate-90 text-action' : 'rotate-0 text-secondary'
                    }`}
                  >
                    chevron_right
                  </span>
                </div>
              </button>

              {/* Expanded Accordion Area (300ms transition) */}
              <div
                className={`overflow-hidden transition-all duration-300 ease-out ${
                  isExpanded ? 'max-h-[380px] opacity-100 pb-3' : 'max-h-0 opacity-0 pb-0'
                }`}
              >
                <div className="pt-1.5 pb-1 px-1">
                  <div className="text-[13px] font-medium tracking-wide uppercase text-secondary pb-1.5">
                    {route.brandName}
                  </div>

                  {/* Outlets list */}
                  <div
                    onScroll={onTrackScroll}
                    className="max-h-[220px] overflow-y-auto space-y-0.5 divide-y-[0.5px] divide-hairline/40 pr-1"
                  >
                    {route.outlets.map((outlet, oIdx) => (
                      <div
                        key={outlet.id || oIdx}
                        className="min-h-[40px] py-1.5 flex items-center justify-between text-[15px]"
                      >
                        <span className="text-black dark:text-white font-normal">
                          {outlet.city}
                        </span>
                        <span className="text-secondary tabular-nums font-normal text-right shrink-0 pl-3">
                          {outlet.itemCount} items
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Start / Selected / Resume Button */}
                  <div className="pt-3">
                    {isDone ? (
                      <button
                        type="button"
                        disabled
                        className="w-full h-[44px] rounded-[12px] bg-hairline/50 text-secondary text-[15px] font-medium flex items-center justify-center cursor-not-allowed"
                      >
                        Route Completed
                      </button>
                    ) : otherRouteInProgress ? (
                      <button
                        type="button"
                        disabled
                        className="w-full h-[44px] rounded-[12px] bg-hairline/40 text-secondary/60 text-[14px] font-medium flex items-center justify-center cursor-not-allowed"
                      >
                        Finish Route {inProgressRoute.routeNumber} first
                      </button>
                    ) : isInProg ? (
                      <button
                        type="button"
                        onClick={() => onStartOrClear(route.id)}
                        className="w-full h-[44px] rounded-[12px] bg-action text-white text-[15px] font-semibold flex items-center justify-center cursor-pointer shadow-sm"
                      >
                        Resume Route {route.routeNumber}
                      </button>
                    ) : isSelected ? (
                      <button
                        type="button"
                        onClick={() => onStartOrClear(route.id)}
                        className="w-full h-[44px] rounded-[12px] border border-action flex items-center justify-center gap-1.5 text-[15px] font-semibold text-action bg-transparent cursor-pointer active:opacity-75 transition-opacity"
                      >
                        <span className="material-symbols-outlined text-[18px]">check</span>
                        <span>Selected</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onStartOrClear(route.id)}
                        className="w-full h-[44px] rounded-[12px] bg-action flex items-center justify-center text-[15px] font-semibold text-white shadow-sm cursor-pointer active:opacity-90 transition-opacity"
                      >
                        Start Route {route.routeNumber}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
