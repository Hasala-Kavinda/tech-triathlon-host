// src/features/dashboard/components/RouteHeader.tsx - Route overview header with progress bar

import React from 'react';
import { RoutePlan, PrototypeConditions } from '@/shared/types';
import { SignalIndicator } from '@/shared/components/ui';

export interface RouteHeaderProps {
  route: RoutePlan;
  totalOutletsCount: number;
  completedOutletsCount: number;
  allOutletsCompleted: boolean;
  conditions: PrototypeConditions;
  onOpenMap: () => void;
}

export const RouteHeader: React.FC<RouteHeaderProps> = ({
  route,
  totalOutletsCount,
  completedOutletsCount,
  allOutletsCompleted,
  conditions,
  onOpenMap
}) => {
  const percentCompleted = totalOutletsCount > 0
    ? Math.min(100, Math.round((completedOutletsCount / totalOutletsCount) * 100))
    : 0;

  return (
    <section
      aria-label="Route Overview Header"
      className="w-full px-1 pt-1 pb-1 select-none animate-row-enter"
      style={{ animationDelay: '0ms' }}
    >
      {/* Header Row: Title & Map button */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight">
          Route <span className="font-mono tabular-nums">{route.routeNumber}</span>
        </h1>
        <button
          type="button"
          onClick={onOpenMap}
          aria-label="Open route map"
          className="text-[17px] font-medium text-action hover:opacity-80 transition-opacity focus:outline-none cursor-pointer min-h-[44px] flex items-baseline pt-1 px-1 -mr-1"
        >
          Map ›
        </button>
      </div>

      {/* Subtitle */}
      <p className="text-[15px] text-secondary font-normal leading-tight mt-0.5">
        {route.brandName} · Marcus Vance
      </p>

      {/* Metrics Summary */}
      <p className="text-[15px] text-secondary tabular-nums font-normal leading-normal mt-2">
        {totalOutletsCount} outlets · {route.distanceKm} km
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

      {/* Signal Indicator Row */}
      <div className="mt-3">
        <SignalIndicator
          networkStatus={conditions.networkStatus}
          gpsStatus={conditions.gpsStatus}
          gpsQuality={conditions.gpsQuality}
        />
      </div>
    </section>
  );
};
