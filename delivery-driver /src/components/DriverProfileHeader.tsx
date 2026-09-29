import React, { useEffect } from 'react';
import { useDriver, GpsStatus } from '../state/driverContext';

export interface DriverProfileHeaderProps {
  overrideStatus?: GpsStatus;
}

export const DriverProfileHeader: React.FC<DriverProfileHeaderProps> = ({
  overrideStatus
}) => {
  const { name, driverId, vehicleInfo, gpsStatus: contextGpsStatus, setGpsStatus } = useDriver();

  // Use override if provided (for state demonstrations), otherwise use context state
  const activeGpsStatus: GpsStatus = overrideStatus || contextGpsStatus || 'off';

  // Check initial browser permission on mount if no override is set
  useEffect(() => {
    if (overrideStatus) return;

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      return;
    }

    if (navigator.permissions && navigator.permissions.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((permissionStatus) => {
          if (permissionStatus.state === 'granted') {
            setGpsStatus('on');
          } else if (permissionStatus.state === 'denied') {
            setGpsStatus('blocked');
          } else {
            setGpsStatus('off');
          }

          permissionStatus.onchange = () => {
            if (permissionStatus.state === 'granted') {
              setGpsStatus('on');
            } else if (permissionStatus.state === 'denied') {
              setGpsStatus('blocked');
            } else {
              setGpsStatus('off');
            }
          };
        })
        .catch(() => {
          // Permissions API query not supported or rejected
        });
    }
  }, [overrideStatus, setGpsStatus]);

  const handleGpsClick = () => {
    if (
      activeGpsStatus === 'on' ||
      activeGpsStatus === 'unavailable' ||
      activeGpsStatus === 'requesting'
    ) {
      return;
    }

    setGpsStatus('requesting');

    if (!('geolocation' in navigator)) {
      setGpsStatus('unavailable');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        // Success: transition to 'on'
        setTimeout(() => {
          setGpsStatus('on');
        }, 250);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          setGpsStatus('blocked');
        } else {
          setGpsStatus('blocked');
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Format vehicle display: e.g. "Isuzu ELF · LK-4821" or "Ford Transit 250 · LK-4821"
  const formattedVehicle = vehicleInfo
    ? vehicleInfo.replace('•', '·')
    : 'Ford Transit 250 · LK-4821';

  return (
    <section
      aria-label="Driver Profile Header"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full px-1 pt-2 pb-1 select-none"
    >
      <div className="flex items-start justify-between">
        {/* Left Column: Driver Info */}
        <div className="min-w-0 pr-3">
          {/* 1. Driver Name (Main Topic: Black) */}
          <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight truncate">
            {name || 'Marcus Vance'}
          </h1>

          {/* 2. Driver ID (Secondary Text, Monospace) */}
          <p className="text-[15px] text-secondary font-mono tabular-nums font-normal leading-tight mt-1">
            ID {driverId ? driverId.replace('FL-', '') : '20418'}
          </p>

          {/* 3. Vehicle Type & Plate (Secondary Text, Tabular) */}
          <p className="text-[15px] text-secondary tabular-nums font-normal leading-tight mt-0.5 truncate">
            {formattedVehicle}
          </p>
        </div>

        {/* Right Column: GPS Button & Helper Text */}
        <div className="flex flex-col items-end shrink-0 pt-0.5">
          {/* Minimum 44px tap target container */}
          <div className="min-h-[44px] min-w-[44px] flex items-center justify-end">
            {activeGpsStatus === 'on' ? (
              /* GPS ON State: Pill with soft emerald tint, success text color, 6px emerald dot */
              <div
                className="h-8 px-3 rounded-full flex items-center gap-1.5 bg-gps-tint text-success-text transition-all duration-200 cursor-default"
                role="status"
                aria-label="GPS Status: On"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-success shrink-0" />
                <span className="text-[13px] font-medium tracking-tight">GPS: On</span>
              </div>
            ) : activeGpsStatus === 'requesting' ? (
              /* Requesting State: Pill with pulsing dot */
              <div
                className="h-8 px-3 rounded-full flex items-center gap-1.5 border border-action/30 bg-action/10 text-action transition-all duration-200 cursor-wait"
                role="status"
                aria-label="GPS Status: Locating"
              >
                <span className="relative flex w-1.5 h-1.5 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-action opacity-75" />
                  <span className="relative inline-flex rounded-full w-1.5 h-1.5 bg-action" />
                </span>
                <span className="text-[13px] font-medium tracking-tight">Locating…</span>
              </div>
            ) : activeGpsStatus === 'unavailable' ? (
              /* Unavailable State: Non-tappable */
              <div
                className="h-8 px-3 rounded-full flex items-center gap-1.5 border border-hairline bg-transparent text-secondary opacity-40 cursor-default"
                role="status"
                aria-label="GPS Status: Unavailable"
              >
                <span className="w-1.5 h-1.5 rounded-full border border-secondary bg-transparent shrink-0" />
                <span className="text-[13px] font-medium tracking-tight">GPS: Unavailable</span>
              </div>
            ) : (
              /* GPS OFF & BLOCKED State: Pill with no fill, 1px outline in hairline, text-secondary, hollow dot */
              <button
                type="button"
                onClick={handleGpsClick}
                className="h-8 px-3 rounded-full flex items-center gap-1.5 border border-hairline bg-transparent text-secondary hover:border-secondary/50 active:scale-[0.98] transition-all duration-200 cursor-pointer focus:outline-none"
                aria-label="GPS Status: Off. Tap to enable location."
              >
                <span className="w-1.5 h-1.5 rounded-full border border-secondary bg-transparent shrink-0" />
                <span className="text-[13px] font-medium tracking-tight">GPS: Off</span>
              </button>
            )}
          </div>

          {/* Blocked helper text line */}
          {activeGpsStatus === 'blocked' && (
            <p className="text-[11px] text-secondary mt-1 text-right leading-tight max-w-[136px] font-normal">
              Turn on location in your browser settings.
            </p>
          )}
        </div>
      </div>

      {/* Signal Row: Display-only 4-bar Signal Row (12px beneath vehicle line, 24px apart) */}
      <div className="mt-3 flex items-center gap-6">
        {/* Item 1: Network · Good (Good/Strong = emerald filled bars) */}
        <div className="flex items-center gap-2">
          <div className="flex items-end gap-[2px] h-[14px]" aria-hidden="true">
            <span className="w-[3px] h-[4px] rounded-full bg-success" />
            <span className="w-[3px] h-[7px] rounded-full bg-success" />
            <span className="w-[3px] h-[10px] rounded-full bg-success" />
            <span className="w-[3px] h-[14px] rounded-full bg-success" />
          </div>
          <span className="text-[14px] leading-none text-secondary">
            Network · <span className="font-medium text-black dark:text-white">Good</span>
          </span>
        </div>

        {/* Item 2: GPS · Strong (Good/Strong = emerald filled bars) */}
        <div className="flex items-center gap-2">
          <div className="flex items-end gap-[2px] h-[14px]" aria-hidden="true">
            <span className="w-[3px] h-[4px] rounded-full bg-success" />
            <span className="w-[3px] h-[7px] rounded-full bg-success" />
            <span className="w-[3px] h-[10px] rounded-full bg-success" />
            <span className="w-[3px] h-[14px] rounded-full bg-success" />
          </div>
          <span className="text-[14px] leading-none text-secondary">
            GPS · <span className="font-medium text-black dark:text-white">Strong</span>
          </span>
        </div>
      </div>
    </section>
  );
};
