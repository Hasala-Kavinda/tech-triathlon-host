// app/src/components/shared/SignalIndicator.tsx - Signal status with expandable helper text

import React from 'react';
import { NetworkStatus, GpsStatus, GpsQuality } from '../../state/store';

export interface SignalIndicatorProps {
  networkStatus?: NetworkStatus;
  gpsStatus?: GpsStatus;
  gpsQuality?: GpsQuality;
  showHelperAlways?: boolean;
}

export const SignalIndicator: React.FC<SignalIndicatorProps> = ({
  networkStatus = 'good',
  gpsStatus = 'on',
  gpsQuality = 'strong',
  showHelperAlways = false
}) => {
  const isNetworkProblem = networkStatus === 'weak' || networkStatus === 'offline';
  const isGpsProblem = gpsStatus === 'off' || gpsStatus === 'blocked' || gpsStatus === 'unavailable';
  const shouldShow = showHelperAlways || isNetworkProblem || isGpsProblem;

  if (!shouldShow) return null;

  const helperText = networkStatus === 'offline'
    ? 'Offline: changes will sync once connection returns'
    : networkStatus === 'weak'
    ? 'Weak network: sync may take longer than usual'
    : gpsStatus === 'off'
    ? 'GPS is off: turn on for live navigation tracking'
    : gpsStatus === 'blocked'
    ? 'Location access denied: enable in system settings'
    : gpsStatus === 'unavailable'
    ? 'GPS signal searching: hold near windshield'
    : null;

  return (
    <div className="w-full flex flex-col gap-1 transition-all duration-200 select-none">
      <div className="flex items-center gap-3 text-[13px] font-medium leading-none">
        {/* Network indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`material-symbols-outlined text-[16px] ${
              networkStatus === 'good'
                ? 'text-success'
                : networkStatus === 'fair'
                ? 'text-attention'
                : 'text-critical'
            }`}
          >
            signal_cellular_alt
          </span>
          <span className="text-secondary capitalize">
            Network · <span className="text-black dark:text-white">{networkStatus}</span>
          </span>
        </div>

        {/* GPS indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`material-symbols-outlined text-[16px] ${
              gpsStatus === 'on' && (gpsQuality === 'strong' || gpsQuality === 'fair')
                ? 'text-success'
                : gpsStatus === 'requesting' || gpsQuality === 'searching'
                ? 'text-attention animate-pulse'
                : 'text-secondary'
            }`}
          >
            navigation
          </span>
          <span className="text-secondary capitalize">
            GPS · <span className="text-black dark:text-white">{gpsStatus === 'on' ? gpsQuality : gpsStatus}</span>
          </span>
        </div>
      </div>

      {/* Expandable helper line */}
      {helperText && (
        <p className="text-[12px] text-secondary/80 font-normal leading-tight pt-0.5 animate-row-enter">
          {helperText}
        </p>
      )}
    </div>
  );
};
