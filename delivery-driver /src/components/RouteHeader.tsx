import React from 'react';
import { SignalIndicator } from './SignalIndicator';
import { OnlineSwitch } from './OnlineSwitch';
import { GpsStatus } from '../state/driverContext';

export interface RouteHeaderProps {
  routeNumber: number;
  brandName: string;
  totalOutlets: number;
  completedOutlets: number;
  distanceKm: number;
  networkStatus?: 'good' | 'fair' | 'offline';
  gpsStatus?: GpsStatus | 'strong' | 'good';
  onBack?: () => void;
  showBackButton?: boolean;
  driverName?: string;
  shiftElapsed?: string;
  isOnline?: boolean;
  onToggleShift?: () => void;
  onOpenMap?: () => void;
}

export const RouteHeader: React.FC<RouteHeaderProps> = ({
  routeNumber,
  brandName,
  totalOutlets,
  completedOutlets,
  distanceKm,
  networkStatus = 'good',
  gpsStatus = 'strong',
  onBack,
  showBackButton = true,
  driverName,
  shiftElapsed,
  isOnline = false,
  onToggleShift,
  onOpenMap
}) => {
  const percentCompleted =
    totalOutlets > 0 ? Math.min(100, Math.round((completedOutlets / totalOutlets) * 100)) : 0;
  const isComplete = totalOutlets > 0 && completedOutlets === totalOutlets;

  return (
    <section
      aria-label="Route Overview Header"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full px-1 pt-2 pb-2 select-none"
    >
      {/* Top action row: Back button on left, OnlineSwitch on right */}
      <div className="flex items-center justify-between mb-2.5 min-h-[32px]">
        {showBackButton && onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to route selection"
            className="inline-flex items-center gap-0.5 text-black dark:text-white hover:opacity-70 active:scale-95 transition-all focus:outline-none py-1 -ml-1"
          >
            <span className="material-symbols-outlined text-[28px] leading-none">chevron_left</span>
            <span className="text-[17px] font-normal leading-none -ml-0.5">Back</span>
          </button>
        ) : (
          <div />
        )}
        {onToggleShift && (
          <OnlineSwitch isOnline={isOnline} onToggle={onToggleShift} />
        )}
      </div>

      {/* 1. Large Title: "Route X" with "Map ›" accent button aligned to baseline (44px tap target) */}
      <div className="flex items-baseline justify-between">
        <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight">
          Route <span className="font-mono tabular-nums">{routeNumber}</span>
        </h1>
        {onOpenMap && (
          <button
            type="button"
            onClick={onOpenMap}
            aria-label="Open route map"
            className="text-[17px] font-medium text-action hover:opacity-80 transition-opacity focus:outline-none cursor-pointer min-h-[44px] flex items-baseline pt-1 px-1 -mr-1"
          >
            Map ›
          </button>
        )}
      </div>

      {/* 2. Subtitle: Brand Name & Driver */}
      <p className="text-[15px] text-secondary font-normal leading-tight mt-0.5">
        {brandName}{driverName ? ` · ${driverName}` : ''}
      </p>

      {/* 3. Summary line: "14 outlets · 42 km" */}
      <p className="text-[15px] text-secondary tabular-nums font-normal leading-normal mt-2">
        {totalOutlets} outlets · {distanceKm} km
      </p>

      {/* 4. Slim Progress Bar with elapsed time */}
      <div className="mt-3.5 space-y-1.5">
        <div
          role="progressbar"
          aria-valuenow={completedOutlets}
          aria-valuemin={0}
          aria-valuemax={totalOutlets}
          className="w-full h-1 bg-hairline/60 rounded-full overflow-hidden"
        >
          <div
            style={{ width: `${percentCompleted}%` }}
            className={`h-full rounded-full transition-all duration-300 ease-out ${
              isComplete ? 'bg-success' : 'bg-action'
            }`}
          />
        </div>
        {/* Caption row with optional shift elapsed time */}
        <div className="flex items-center justify-between text-[13px] text-secondary tabular-nums font-normal">
          <span>
            {completedOutlets} of {totalOutlets} completed
          </span>
          {shiftElapsed && (
            <span className="font-mono text-[12px]">
              {shiftElapsed} elapsed
            </span>
          )}
        </div>
      </div>

      {/* 5. Signal Row: SignalIndicator */}
      <div className="mt-3.5 pt-0.5">
        <SignalIndicator
          networkStatus={networkStatus}
          gpsStatus={gpsStatus === 'on' ? 'strong' : gpsStatus}
        />
      </div>
    </section>
  );
};
