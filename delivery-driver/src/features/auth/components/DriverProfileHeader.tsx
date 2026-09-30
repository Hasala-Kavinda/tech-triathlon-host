// src/features/auth/components/DriverProfileHeader.tsx - Driver header with GPS pill and sign-out button

import React from 'react';
import { DriverProfile, PrototypeConditions } from '@/shared/types';
import { LogOutIcon } from '@/shared/components/ui';

export interface DriverProfileHeaderProps {
  driver: DriverProfile;
  conditions: PrototypeConditions;
  isLocatingGps: boolean;
  onGpsTap: () => void;
  onOpenSignOut: () => void;
}

export const DriverProfileHeader: React.FC<DriverProfileHeaderProps> = ({
  driver,
  conditions,
  isLocatingGps,
  onGpsTap,
  onOpenSignOut
}) => {
  return (
    <section
      aria-label="Driver Profile Header"
      className="w-full px-1 pt-1 pb-1 select-none animate-row-enter"
      style={{ animationDelay: '0ms' }}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 pr-3">
          <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight truncate">
            {driver.name}
          </h1>
          <p className="text-[15px] text-secondary font-mono tabular-nums font-normal leading-tight mt-1">
            ID {driver.driverId}
          </p>
          <p className="text-[15px] text-secondary tabular-nums font-normal leading-tight mt-0.5 truncate">
            {driver.vehicleType} · {driver.plateNumber}
          </p>
        </div>

        {/* GPS Status Pill & Sign out */}
        <div className="flex flex-col items-end shrink-0 pt-0.5">
          <div className="min-h-[44px] min-w-[44px] flex items-center justify-end">
            <button
              type="button"
              onClick={onGpsTap}
              className={`h-8 px-3 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer ${
                conditions.gpsStatus === 'on'
                  ? 'bg-gps-tint text-success-text cursor-default'
                  : isLocatingGps
                  ? 'bg-attention/20 text-black dark:text-white'
                  : conditions.gpsStatus === 'blocked'
                  ? 'bg-critical/20 text-critical'
                  : 'bg-hairline/50 text-secondary'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  conditions.gpsStatus === 'on'
                    ? 'bg-success'
                    : isLocatingGps
                    ? 'bg-attention animate-pulse'
                    : conditions.gpsStatus === 'blocked'
                    ? 'bg-critical'
                    : 'bg-secondary'
                }`}
              />
              <span className="text-[13px] font-medium tracking-tight">
                {isLocatingGps
                  ? 'Locating…'
                  : conditions.gpsStatus === 'on'
                  ? 'GPS: On'
                  : conditions.gpsStatus === 'blocked'
                  ? 'GPS: Blocked'
                  : conditions.gpsStatus === 'unavailable'
                  ? 'GPS: N/A'
                  : 'GPS: Off'}
              </span>
            </button>
          </div>

          {/* Sign out button */}
          <button
            type="button"
            onClick={onOpenSignOut}
            aria-label="Sign out"
            data-testid="sign-out-button"
            className="min-h-[44px] min-w-[44px] px-2 -mr-2 flex items-center gap-1.5 text-secondary hover:text-black dark:hover:text-white active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action rounded-lg text-[13px] font-medium transition-colors cursor-pointer select-none"
          >
            <LogOutIcon className="w-4 h-4 text-current shrink-0" />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </section>
  );
};
