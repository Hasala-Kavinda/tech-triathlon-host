import React, { useState } from 'react';
import { useRoute, RoutePlan } from '../state/routeContext';

export interface TodayPlanProps {
  overrideState?:
    | 'loading'
    | 'collapsed'
    | 'expanded'
    | 'long'
    | 'activation'
    | 'selected'
    | 'dragging'
    | 'empty';
}

export const TodayPlan: React.FC<TodayPlanProps> = ({ overrideState }) => {
  const { routes: contextRoutes, selectedRouteId, setSelectedRouteId } = useRoute();

  // Local state for expanded route accordion (expanding is ONLY viewing)
  const [expandedRouteId, setExpandedRouteId] = useState<number | null>(() => {
    if (overrideState === 'expanded' || overrideState === 'activation') return 2;
    if (overrideState === 'long') return 1;
    if (overrideState === 'selected' || overrideState === 'collapsed') return null;
    return null;
  });

  const isOverride = Boolean(overrideState);

  const isLoading = overrideState === 'loading';
  const isEmpty = overrideState === 'empty' || (!overrideState && contextRoutes.length === 0);

  // Filter or adjust routes based on state
  let displayRoutes: RoutePlan[] = contextRoutes;
  if (overrideState === 'empty') {
    displayRoutes = [];
  } else if (overrideState === 'expanded') {
    displayRoutes = contextRoutes.map((r) =>
      r.id === 2 ? { ...r, outlets: r.outlets.slice(0, 8) } : r
    );
  } else if (overrideState === 'long') {
    displayRoutes = contextRoutes;
  }

  // Determine active selected route ID: if none selected yet, default to first route (Route 1)
  const defaultFirstRouteId = displayRoutes.length > 0 ? displayRoutes[0].id : 1;
  const activeSelectedId = isOverride
    ? overrideState === 'empty'
      ? null
      : overrideState === 'selected' || overrideState === 'activation' || overrideState === 'dragging'
      ? 2
      : 1
    : selectedRouteId ?? defaultFirstRouteId;

  // Determine active expanded route ID
  const activeExpandedId = isOverride
    ? overrideState === 'expanded' || overrideState === 'activation'
      ? 2
      : overrideState === 'long'
      ? 1
      : null
    : expandedRouteId;

  // Calculate totals
  const totalRoutes = displayRoutes.length;
  const totalOutlets = displayRoutes.reduce((sum, r) => sum + r.outlets.length, 0);
  const totalDistance = displayRoutes.reduce((sum, r) => sum + r.distanceKm, 0);

  // Formatted date (Apple style: e.g. "Monday, Sep 28")
  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  // Expanding/collapsing is local accordion viewing only (does NOT select route)
  const handleToggleExpand = (routeId: number) => {
    if (isOverride) return;
    setExpandedRouteId((prev) => (prev === routeId ? null : routeId));
  };

  // Start button selects the route or switches selection
  const handleToggleSelect = (routeId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOverride) return;
    setSelectedRouteId(routeId);
  };

  const getStatusDotColor = (status: 'completed' | 'in_progress' | 'pending') => {
    switch (status) {
      case 'completed':
        return 'bg-success';
      case 'in_progress':
        return 'bg-action';
      case 'pending':
      default:
        return 'bg-pending';
    }
  };

  return (
    <section
      aria-label="Today's Plan"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full bg-surface rounded-[20px] border border-hairline p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none"
    >
      {/* 1. Header row - Main Topic in Black */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white leading-none">
          Today's Plan
        </h2>
        <span className="text-[15px] text-secondary tabular-nums font-normal">
          {dateFormatted}
        </span>
      </div>

      {/* 2. Summary line: TOTAL DISTANCE of all today's routes */}
      {!isLoading && !isEmpty && (
        <div className="mt-1.5 text-[15px] text-secondary tabular-nums font-normal leading-normal">
          {totalRoutes} routes · {totalOutlets} outlets · {totalDistance} km
        </div>
      )}

      {/* 3. Content Area */}
      {isLoading ? (
        /* Loading Skeleton State with soft shimmer */
        <div className="mt-3.5 space-y-3 animate-pulse">
          <div className="h-4 w-44 bg-hairline/60 rounded-md"></div>
          <div className="space-y-2 pt-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-11 w-full bg-bg rounded-xl flex items-center justify-between px-3 border border-hairline/40"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-16 h-4 bg-hairline/80 rounded"></div>
                  <div className="w-24 h-3 bg-hairline/50 rounded"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-hairline"></div>
                  <div className="w-4 h-4 bg-hairline/60 rounded"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : isEmpty ? (
        /* Empty State */
        <div className="py-10 text-center">
          <p className="text-[15px] text-secondary">
            No routes assigned today
          </p>
        </div>
      ) : (
        /* Populated Routes List */
        <div className="mt-2 divide-y-[0.5px] divide-hairline">
          {displayRoutes.map((route, idx) => {
            const isExpanded = activeExpandedId === route.id;
            const isSelected = activeSelectedId === route.id;

            return (
              <div
                key={route.id}
                style={{
                  animationDelay: `${idx * 40}ms`
                }}
                className="transition-colors duration-150"
              >
                {/* Route Header Row (min 44px tap target) - EXPANDING IS ONLY VIEWING */}
                <button
                  type="button"
                  onClick={() => handleToggleExpand(route.id)}
                  aria-expanded={isExpanded}
                  className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-left focus:outline-none group active:opacity-70 transition-opacity"
                >
                  {/* Left: Route Title (Selected is Blue, unselected is Black) & Secondary Info */}
                  <div className="flex items-baseline gap-2 min-w-0 pr-2">
                    <span
                      className={`text-[17px] font-medium tracking-tight ${
                        isSelected ? 'text-action' : 'text-black dark:text-white'
                      }`}
                    >
                      Route {route.routeNumber}
                    </span>
                    <span className="text-[15px] text-secondary tabular-nums font-normal truncate">
                      {route.outlets.length} outlets · {route.distanceKm} km
                      {/* Selected indicator if this route is chosen (Blue) */}
                      {isSelected && (
                        <span className="ml-1.5 inline-flex items-center font-medium text-action">
                          · Selected
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Right: Status dot & Chevron (Selected chevron is Blue) */}
                  <div className="flex items-center gap-2.5 shrink-0 pl-2">
                    <span
                      className={`w-2 h-2 rounded-full shrink-0 ${getStatusDotColor(route.status)}`}
                      title={route.status}
                    ></span>
                    <span
                      className={`material-symbols-outlined text-[20px] transition-transform duration-300 transform select-none ${
                        isExpanded
                          ? isSelected
                            ? 'rotate-90 text-action'
                            : 'rotate-90 text-black dark:text-white'
                          : isSelected
                          ? 'rotate-0 text-action'
                          : 'rotate-0 text-secondary opacity-50 group-hover:opacity-80'
                      }`}
                    >
                      chevron_right
                    </span>
                  </div>
                </button>

                {/* Expanded Outlets Accordion (height animates ~300ms ease-out) */}
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    isExpanded ? 'max-h-[380px] opacity-100 pb-3' : 'max-h-0 opacity-0 pb-0'
                  }`}
                >
                  <div className="pt-1.5 pb-1 px-1">
                    {/* Quiet Brand Caption Once Above the List */}
                    <div className="text-[13px] font-medium tracking-wide uppercase text-secondary pb-1.5">
                      {route.brandName}
                    </div>

                    {/* Outlets List (internally scrollable if long, max-h-[240px]) */}
                    <div className="max-h-[240px] overflow-y-auto space-y-0.5 divide-y-[0.5px] divide-hairline/40 pr-1">
                      {route.outlets.map((outlet, oIdx) => (
                        <div
                          key={outlet.id || oIdx}
                          className="min-h-[44px] py-2 flex items-center justify-between text-[15px] leading-snug"
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

                    {/* START BUTTON: At end of expanded area, BELOW outlet list, outside scroll area (always visible) */}
                    <div className="pt-3">
                      {isSelected ? (
                        /* Quiet "Selected" State (accent text with a checkmark, no fill) */
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelect(route.id, e)}
                          className="w-full h-[44px] rounded-[12px] border border-action flex items-center justify-center gap-1.5 text-[15px] font-semibold text-action bg-transparent active:opacity-75 transition-opacity"
                        >
                          <span className="material-symbols-outlined text-[18px]">check</span>
                          <span>Selected</span>
                        </button>
                      ) : (
                        /* Full-width "Start" button (44px tall, 12px radius, accent background, white text) */
                        <button
                          type="button"
                          onClick={(e) => handleToggleSelect(route.id, e)}
                          className="w-full h-[44px] rounded-[12px] bg-action flex items-center justify-center text-[15px] font-semibold text-white shadow-sm active:opacity-90 transition-opacity"
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
      )}
    </section>
  );
};
