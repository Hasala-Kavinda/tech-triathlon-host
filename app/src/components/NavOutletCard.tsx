import React from 'react';
import { Outlet } from '../state/routeContext';
import { DriverPosition, GpsStatus } from '../state/driverContext';
import { SignalIndicator } from './SignalIndicator';
import { haversineMeters, formatDistance, ARRIVAL_RADIUS_METERS } from '../utils/geo';

export interface NavOutletCardProps {
  outlet: Outlet;
  totalOutlets: number;
  isUpNext: boolean;
  driverPosition: DriverPosition | null;
  gpsStatus: GpsStatus;
  onRequestGps: () => void;
  onOpenOutlet: (outlet: Outlet) => void;
  networkStatus?: 'good' | 'fair' | 'offline';
  className?: string;
  cardRef?: React.Ref<HTMLDivElement>;
  isNavigating?: boolean;
  onStartDirections?: () => void;
  onEndDirections?: () => void;
}

/**
 * Floating outlet card at the bottom of the map.
 * 16px from sides, 16px above bottom safe area, 16px radius, surface fill, 0.5px hairline.
 * Soft shadow in light mode, no shadow in dark mode.
 * Contains Row 1 (label & distance), Row 2 (city), Row 3 (status dot + text), Row 4 (equal buttons).
 */
export const NavOutletCard: React.FC<NavOutletCardProps> = ({
  outlet,
  totalOutlets,
  isUpNext,
  driverPosition,
  gpsStatus,
  onRequestGps,
  onOpenOutlet,
  networkStatus = 'good',
  className = '',
  cardRef,
  isNavigating = false,
  onStartDirections,
  onEndDirections
}) => {
  const isCompleted = outlet.status === 'completed';
  const isInProgress = outlet.status === 'in_progress';

  // Distance computation
  let distanceMeters: number | null = null;
  if (driverPosition && outlet.lat != null && outlet.lng != null) {
    distanceMeters = haversineMeters(driverPosition, {
      lat: outlet.lat,
      lng: outlet.lng
    });
  }

  const isArrived = distanceMeters != null && distanceMeters <= ARRIVAL_RADIUS_METERS;

  // Row 1 Label
  let labelText = '';
  if (isArrived && !isCompleted) {
    labelText = "You've arrived";
  } else if (isUpNext) {
    labelText = 'Up next';
  } else {
    labelText = `Outlet ${outlet.visitOrder ?? 1} of ${totalOutlets}`;
  }

  // Row 4 Button text
  const openButtonLabel = isInProgress ? 'Resume' : 'Open';
  const openButtonFilled = isArrived && !isCompleted;
  const directionsButtonFilled = !openButtonFilled && !isCompleted;

  const handleExternalMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (outlet.lat != null && outlet.lng != null) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${outlet.lat},${outlet.lng}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDirectionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onStartDirections) {
      onStartDirections();
    } else {
      handleExternalMaps(e);
    }
  };

  const handleOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    onOpenOutlet(outlet);
  };

  const isSignalDegraded =
    networkStatus === 'fair' ||
    networkStatus === 'offline' ||
    gpsStatus === 'off' ||
    gpsStatus === 'unavailable' ||
    gpsStatus === 'blocked';

  if (isNavigating) {
    const etaMinutes = distanceMeters != null ? Math.max(1, Math.round((distanceMeters / 1000) * 2.5)) : 8;
    const distanceKmText = distanceMeters != null ? (distanceMeters / 1000).toFixed(1) : '3.2';

    return (
      <div
        ref={cardRef}
        role="status"
        aria-live="polite"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        className={`mx-4 rounded-[20px] bg-surface/95 backdrop-blur-xl border border-hairline p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-none select-none z-[1000] pointer-events-auto transition-all duration-200 animate-row-enter ${className}`}
      >
        {/* Row 1: ETA & Fastest Route */}
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] font-bold text-text-primary tracking-tight font-mono tabular-nums leading-none">
              {isArrived ? 'Arrived' : etaMinutes}
            </span>
            {!isArrived && (
              <span className="text-[14px] font-medium text-text-secondary leading-none">min</span>
            )}
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success-text text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span>Fastest route</span>
          </div>
        </div>

        {/* Row 2: Distance & Destination */}
        <div className="flex items-center justify-between text-[13px] text-text-secondary mt-1 font-mono tabular-nums">
          <span>{isArrived ? '0.0 km remaining' : `≈ ${distanceKmText} km · 09:42 arrival`}</span>
          <span className="text-text-primary font-sans font-medium truncate max-w-[150px]">{outlet.city}</span>
        </div>

        {/* Row 3: Action Buttons */}
        <div className="grid grid-cols-2 gap-3 mt-3.5 pt-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onEndDirections?.();
            }}
            className="h-12 rounded-[12px] border border-hairline bg-surface hover:bg-hairline/25 text-text-primary font-medium text-[15px] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
          >
            <span>End Route</span>
          </button>

          <button
            type="button"
            onClick={handleOpen}
            className="h-12 rounded-[12px] bg-action text-white font-semibold text-[15px] flex items-center justify-center gap-1 shadow-sm hover:opacity-95 transition-all cursor-pointer active:scale-[0.98]"
          >
            <span>{isArrived ? "I've Arrived" : openButtonLabel}</span>
          </button>
        </div>

        {/* Row 4: Google maps fallback */}
        <div className="mt-2.5 pt-2 border-t border-hairline/50 flex justify-center">
          <button
            type="button"
            onClick={handleExternalMaps}
            className="text-[11px] text-text-secondary hover:text-action flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            <span>Open in external maps ↗</span>
          </button>
        </div>
      </div>
    );
  }
    gpsStatus === 'off' ||
    gpsStatus === 'unavailable' ||
    gpsStatus === 'blocked';

  return (
    <div
      ref={cardRef}
      role="status"
      aria-live="polite"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className={`mx-4 rounded-[16px] bg-surface border border-hairline p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-none select-none z-[1000] pointer-events-auto transition-opacity duration-150 ${className}`}
    >
      {/* Row 1: Label and Distance */}
      <div className="flex items-center justify-between min-h-[18px]">
        <div className="flex items-center gap-1.5">
          {isArrived && !isCompleted && (
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--success)' }}
              aria-hidden="true"
            />
          )}
          <span
            className={`text-[13px] font-medium leading-none ${
              isArrived && !isCompleted ? 'text-success-text' : 'text-secondary'
            }`}
          >
            {labelText}
          </span>
        </div>

        {distanceMeters != null && gpsStatus === 'on' && (
          <span className="text-[13px] font-mono tabular-nums text-secondary leading-none">
            {formatDistance(distanceMeters)} away
          </span>
        )}
      </div>

      {/* Row 2: City */}
      <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight leading-snug mt-1 truncate">
        {outlet.city}
      </h2>

      {/* Row 3: Status dot plus text */}
      <div className="flex items-center gap-1.5 mt-0.5 min-h-[20px]">
        {isCompleted ? (
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--success)' }}
              aria-hidden="true"
            />
            <span className="text-[14px] text-secondary font-normal">
              Completed · <span className="font-mono tabular-nums">{outlet.completedAt || '06:52'}</span>
            </span>
          </>
        ) : isInProgress ? (
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--action)' }}
              aria-hidden="true"
            />
            <span className="text-[14px] text-secondary font-normal">
              <span className="font-mono tabular-nums">{outlet.itemCount}</span> items · In progress
            </span>
          </>
        ) : (
          <>
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--pending)' }}
              aria-hidden="true"
            />
            <span className="text-[14px] text-secondary font-normal">
              <span className="font-mono tabular-nums">{outlet.itemCount}</span> items · Pending
            </span>
          </>
        )}
      </div>

      {/* GPS Status helper line if GPS is not available */}
      {gpsStatus !== 'on' && !isCompleted && (
        <div className="mt-2 text-[13px] text-secondary flex items-center gap-1.5">
          {gpsStatus === 'off' && (
            <>
              <span>Turn on GPS to see your position.</span>
              <button
                type="button"
                onClick={onRequestGps}
                className="text-[13px] font-medium text-action hover:underline focus:outline-none cursor-pointer"
              >
                Turn on
              </button>
            </>
          )}
          {gpsStatus === 'blocked' && (
            <span>Location is blocked in your browser settings.</span>
          )}
          {gpsStatus === 'requesting' && <span>Locating…</span>}
        </div>
      )}

      {/* SignalIndicator if network or gps is weak or offline */}
      {isSignalDegraded && (
        <div className="mt-2 pt-1 border-t border-hairline">
          <SignalIndicator
            networkStatus={networkStatus}
            gpsStatus={gpsStatus}
            helperText="You are offline. Actions are saved on this phone and sent later."
          />
        </div>
      )}

      {/* Row 4: Two equal buttons (48px tall, 8px radius, 12px apart) */}
      {!isCompleted && (
        <div className="grid grid-cols-2 gap-3 mt-3.5">
          {/* Directions Button */}
          <button
            type="button"
            onClick={handleDirectionsClick}
            className={`h-12 rounded-lg text-[15px] flex items-center justify-center transition-all active:scale-[0.98] focus:outline-none cursor-pointer ${
              directionsButtonFilled
                ? 'bg-action text-white font-semibold shadow-sm'
                : 'border-[1.5px] border-hairline bg-surface text-black dark:text-white font-medium hover:border-action/40'
            }`}
          >
            Directions
          </button>

          {/* Open / Resume Button */}
          <button
            type="button"
            onClick={handleOpen}
            className={`h-12 rounded-lg text-[15px] flex items-center justify-center transition-all active:scale-[0.98] focus:outline-none cursor-pointer ${
              openButtonFilled
                ? 'bg-action text-white font-semibold shadow-sm'
                : 'border-[1.5px] border-hairline bg-surface text-black dark:text-white font-medium hover:border-action/40'
            }`}
          >
            {openButtonLabel}
          </button>
        </div>
      )}
    </div>
  );
};
