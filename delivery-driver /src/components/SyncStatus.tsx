import React from 'react';
import { SignalIndicator } from './SignalIndicator';
import { GpsStatus } from '../state/driverContext';

export type SyncState = 'synced' | 'pending' | 'syncing';

export interface SyncStatusProps {
  status: SyncState;
  pendingCount?: number;
  onSyncNow?: () => void;
  networkStatus?: 'good' | 'fair' | 'offline';
  gpsStatus?: GpsStatus | 'strong' | 'good';
  className?: string;
}

/**
 * Centered sync status line (dot + text, 14px):
 * - all synced: emerald dot, "All synced"
 * - some pending: sunburst dot, "X waiting to sync" with an accent "Sync now" text button on the right.
 *   Beneath it, one line of secondary text: "They will be confirmed when you are online."
 * - syncing: gray pulsing dot, "Syncing…"
 * Displays SignalIndicator ONLY when Network or GPS is Weak/Fair or Offline.
 */
export const SyncStatus: React.FC<SyncStatusProps> = ({
  status,
  pendingCount = 0,
  onSyncNow,
  networkStatus = 'good',
  gpsStatus = 'strong',
  className = ''
}) => {
  const isNetworkDegraded = networkStatus === 'fair' || networkStatus === 'offline';
  const isGpsDegraded =
    gpsStatus === 'off' || gpsStatus === 'unavailable' || gpsStatus === 'blocked' || gpsStatus === 'requesting';
  const showSignal = isNetworkDegraded || isGpsDegraded;

  return (
    <div className={`w-full flex flex-col items-center select-none ${className}`}>
      {/* 1. Status row */}
      {status === 'synced' && (
        <div className="flex items-center justify-center gap-2 text-[14px] leading-tight">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: 'var(--success)' }}
            aria-hidden="true"
          />
          <span className="text-secondary font-normal">All synced</span>
        </div>
      )}

      {status === 'pending' && (
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center justify-center gap-2 text-[14px] leading-tight">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: 'var(--attention)' }}
              aria-hidden="true"
            />
            <span className="text-secondary font-normal">
              {pendingCount} {pendingCount === 1 ? 'outlet' : 'outlets'} waiting to sync
            </span>
            {onSyncNow && (
              <button
                type="button"
                onClick={onSyncNow}
                className="ml-1 text-[14px] font-medium text-action hover:underline focus:outline-none cursor-pointer"
              >
                Sync now
              </button>
            )}
          </div>
          <p className="text-[13px] text-secondary font-normal tracking-tight">
            They will be confirmed when you are online.
          </p>
        </div>
      )}

      {status === 'syncing' && (
        <div className="flex items-center justify-center gap-2 text-[14px] leading-tight">
          <span
            className="w-2 h-2 rounded-full shrink-0 animate-pulse"
            style={{ backgroundColor: 'var(--pending)' }}
            aria-hidden="true"
          />
          <span className="text-secondary font-normal">Syncing…</span>
        </div>
      )}

      {/* 2. Signal row if degraded */}
      {showSignal && (
        <div className="mt-3.5 pt-1 flex flex-col items-center">
          <SignalIndicator
            networkStatus={networkStatus}
            gpsStatus={gpsStatus}
            helperText="You are offline. Actions are saved on this phone and sent later."
          />
        </div>
      )}
    </div>
  );
};
