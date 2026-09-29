import React from 'react';

export interface SignalIndicatorProps {
  networkStatus?: 'good' | 'fair' | 'offline';
  gpsStatus?: 'strong' | 'good' | 'on' | 'off' | 'unavailable' | 'requesting' | 'blocked';
  className?: string;
  helperText?: string;
}

export const SignalIndicator: React.FC<SignalIndicatorProps> = ({
  networkStatus = 'good',
  gpsStatus = 'strong',
  className = '',
  helperText
}) => {
  const isOffline = networkStatus === 'offline';
  const isGpsActive = gpsStatus === 'strong' || gpsStatus === 'good' || gpsStatus === 'on';

  return (
    <div className={`select-none ${className}`}>
      {/* 4-bar Signal Row (Good/Strong = emerald filled bars) */}
      <div className="flex items-center gap-6">
        {/* Item 1: Network */}
        <div className="flex items-center gap-2">
          <div className="flex items-end gap-[2px] h-[14px]" aria-hidden="true">
            {isOffline ? (
              <>
                <span className="w-[3px] h-[4px] rounded-full bg-secondary/30" />
                <span className="w-[3px] h-[7px] rounded-full bg-secondary/30" />
                <span className="w-[3px] h-[10px] rounded-full bg-secondary/30" />
                <span className="w-[3px] h-[14px] rounded-full bg-secondary/30" />
              </>
            ) : networkStatus === 'fair' ? (
              <>
                <span className="w-[3px] h-[4px] rounded-full bg-attention" />
                <span className="w-[3px] h-[7px] rounded-full bg-attention" />
                <span className="w-[3px] h-[10px] rounded-full bg-secondary/30" />
                <span className="w-[3px] h-[14px] rounded-full bg-secondary/30" />
              </>
            ) : (
              <>
                <span className="w-[3px] h-[4px] rounded-full bg-success" />
                <span className="w-[3px] h-[7px] rounded-full bg-success" />
                <span className="w-[3px] h-[10px] rounded-full bg-success" />
                <span className="w-[3px] h-[14px] rounded-full bg-success" />
              </>
            )}
          </div>
          <span className="text-[14px] leading-none text-secondary">
            Network ·{' '}
            <span
              className={`font-medium ${
                isOffline
                  ? 'text-attention'
                  : 'text-black dark:text-white'
              }`}
            >
              {isOffline ? 'Offline' : networkStatus === 'fair' ? 'Fair' : 'Good'}
            </span>
          </span>
        </div>

        {/* Item 2: GPS */}
        <div className="flex items-center gap-2">
          <div className="flex items-end gap-[2px] h-[14px]" aria-hidden="true">
            {isGpsActive ? (
              <>
                <span className="w-[3px] h-[4px] rounded-full bg-success" />
                <span className="w-[3px] h-[7px] rounded-full bg-success" />
                <span className="w-[3px] h-[10px] rounded-full bg-success" />
                <span className="w-[3px] h-[14px] rounded-full bg-success" />
              </>
            ) : gpsStatus === 'requesting' ? (
              <>
                <span className="w-[3px] h-[4px] rounded-full bg-action animate-pulse" />
                <span className="w-[3px] h-[7px] rounded-full bg-action animate-pulse" />
                <span className="w-[3px] h-[10px] rounded-full bg-secondary/30" />
                <span className="w-[3px] h-[14px] rounded-full bg-secondary/30" />
              </>
            ) : (
              <>
                <span className="w-[3px] h-[4px] rounded-full bg-secondary/30" />
                <span className="w-[3px] h-[7px] rounded-full bg-secondary/30" />
                <span className="w-[3px] h-[10px] rounded-full bg-secondary/30" />
                <span className="w-[3px] h-[14px] rounded-full bg-secondary/30" />
              </>
            )}
          </div>
          <span className="text-[14px] leading-none text-secondary">
            GPS ·{' '}
            <span className="font-medium text-black dark:text-white">
              {gpsStatus === 'strong'
                ? 'Strong'
                : gpsStatus === 'good'
                ? 'Good'
                : gpsStatus === 'requesting'
                ? 'Locating'
                : 'Off'}
            </span>
          </span>
        </div>
      </div>

      {/* Offline helper line (quiet inline text, no loud banner) */}
      {isOffline && (
        <p className="text-[12px] text-secondary mt-2 leading-tight">
          {helperText || 'Offline mode · changes will sync when connected'}
        </p>
      )}
    </div>
  );
};
