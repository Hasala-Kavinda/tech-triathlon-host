import React from 'react';
import { LOGIN_URL } from '../data/mock';

export interface EndShiftSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmEndShift: () => void;
  unsyncedCount?: number;
}

/**
 * Bottom sheet (16px top radius, handle) confirming shift end:
 * - Title: "End your shift?"
 * - Secondary line: "You can sign in again any time."
 * - If unsynced: "X outlets are not synced yet. Stay online until they finish."
 * - Primary button "End shift" + text button "Cancel"
 */
export const EndShiftSheet: React.FC<EndShiftSheetProps> = ({
  isOpen,
  onClose,
  onConfirmEndShift,
  unsyncedCount = 0
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-shift-title"
      className="fixed inset-0 z-50 flex flex-col justify-end select-none"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif',
          paddingBottom: 'max(20px, calc(12px + env(safe-area-inset-bottom, 0px)))'
        }}
        className="relative w-full max-w-[500px] mx-auto bg-surface rounded-t-[16px] border-t border-hairline p-5 pt-3 flex flex-col gap-3 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200"
      >
        {/* Handle */}
        <div className="w-9 h-1 rounded-full bg-hairline mx-auto shrink-0 mb-1" />

        {/* Content */}
        <div className="text-center space-y-1">
          <h2
            id="end-shift-title"
            className="text-[20px] font-bold text-black dark:text-white tracking-tight"
          >
            End your shift?
          </h2>
          <p className="text-[14px] text-secondary font-normal">
            You can sign in again any time.
          </p>
          {unsyncedCount > 0 && (
            <p className="text-[13px] text-secondary font-normal pt-1">
              {unsyncedCount} {unsyncedCount === 1 ? 'outlet is' : 'outlets are'} not synced yet. Stay online until they finish.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onConfirmEndShift}
            className="w-full h-12 rounded-xl bg-action text-white text-[16px] font-semibold flex items-center justify-center transition-all active:scale-[0.98] shadow-sm focus:outline-none cursor-pointer"
          >
            End shift
          </button>

          {/* Cancel Text Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 text-secondary text-[15px] font-medium flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export const LogOutIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`lucide lucide-log-out ${className}`}
    aria-hidden="true"
  >
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

export interface SignOutSheetProps {
  isOpen: boolean;
  onClose: () => void;
  pendingSyncCount?: number;
  isOffline?: boolean;
  isRouteInProgress?: boolean;
  onSyncNow?: () => void;
  isSyncing?: boolean;
  onPerformReset?: () => void;
}

export const SignOutSheet: React.FC<SignOutSheetProps> = ({
  isOpen,
  onClose,
  pendingSyncCount = 0,
  isOffline = false,
  isRouteInProgress = false,
  onSyncNow,
  isSyncing = false,
  onPerformReset
}) => {
  const [isSigningOut, setIsSigningOut] = React.useState(false);
  const [acknowledgedRouteWarning, setAcknowledgedRouteWarning] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setIsSigningOut(false);
      setAcknowledgedRouteWarning(false);
    }
  }, [isOpen]);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const hasPendingItems = pendingSyncCount > 0;
  const isDeviceOffline = isOffline || (typeof navigator !== 'undefined' && !navigator.onLine);
  const isBlocked = hasPendingItems || isDeviceOffline;

  const handleConfirm = () => {
    if (isSigningOut || isBlocked) return;
    if (isRouteInProgress && !acknowledgedRouteWarning) return;

    setIsSigningOut(true);

    // 1. Clear only this app's driver session storage
    try {
      localStorage.removeItem('waylink.v1.driver');
    } catch (e) {
      console.error('Failed to remove driver session:', e);
    }

    // 2. Reset in-memory app state
    if (onPerformReset) {
      onPerformReset();
    }

    // 3. Full-page redirect without adding to history
    const urlObj = new URL(LOGIN_URL, window.location.origin);
    urlObj.searchParams.set('logged_out', '1');
    window.location.replace(urlObj.toString());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sign-out-title"
      aria-describedby="sign-out-description"
      className="fixed inset-0 z-50 flex flex-col justify-end select-none"
    >
      {/* Backdrop: tapping outside closes sheet */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Sheet container: 16px top radius, 200ms transition respecting prefers-reduced-motion */}
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif',
          paddingBottom: 'max(20px, calc(12px + env(safe-area-inset-bottom, 0px)))'
        }}
        className="relative w-full max-w-[500px] mx-auto bg-surface rounded-t-[16px] border-t border-hairline p-5 pt-3 flex flex-col gap-3 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200 motion-reduce:animate-none"
      >
        {/* Handle */}
        <div className="w-9 h-1 rounded-full bg-hairline mx-auto shrink-0 mb-1" />

        {/* Content */}
        <div className="text-center space-y-1">
          <h2
            id="sign-out-title"
            className="text-[20px] font-bold text-black dark:text-white tracking-tight"
          >
            Sign out?
          </h2>
          <p id="sign-out-description" className="text-[14px] text-secondary font-normal">
            You will need to sign in again.
          </p>

          {/* Safety Check 1: Pending Sync Items */}
          {hasPendingItems && (
            <div className="pt-2 flex flex-col items-center gap-1.5">
              <p className="text-[13px] text-secondary font-normal">
                {pendingSyncCount} {pendingSyncCount === 1 ? 'item is' : 'items are'} waiting to sync. Sign out after they upload.
              </p>
              {onSyncNow && (
                <button
                  type="button"
                  onClick={onSyncNow}
                  disabled={isSyncing}
                  className="text-[13px] text-action hover:underline active:opacity-70 font-medium py-1 px-2 focus:outline-none cursor-pointer"
                >
                  {isSyncing ? 'Syncing…' : 'Try sync now'}
                </button>
              )}
            </div>
          )}

          {/* Safety Check 2: Offline */}
          {!hasPendingItems && isDeviceOffline && (
            <p className="text-[13px] text-secondary font-normal pt-2">
              You're offline. Connect to sign out.
            </p>
          )}

          {/* Safety Check 3: Route in Progress */}
          {!isBlocked && isRouteInProgress && (
            <p className="text-[13px] text-critical font-normal pt-2">
              Your route is still in progress. Signing out will leave it unfinished.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          {/* If route in progress and not yet acknowledged, offer 'Sign out anyway' */}
          {!isBlocked && isRouteInProgress && !acknowledgedRouteWarning ? (
            <button
              type="button"
              onClick={() => setAcknowledgedRouteWarning(true)}
              className="w-full h-12 rounded-xl bg-hairline/60 hover:bg-hairline text-black dark:text-white text-[15px] font-medium flex items-center justify-center transition-all active:scale-[0.98] focus:outline-none cursor-pointer"
            >
              Sign out anyway
            </button>
          ) : (
            /* Destructive button */
            <button
              type="button"
              onClick={handleConfirm}
              disabled={isBlocked || isSigningOut}
              data-testid="sign-out-confirm"
              className={`w-full h-12 rounded-xl bg-critical text-white text-[16px] font-semibold flex items-center justify-center transition-all active:scale-[0.98] shadow-sm focus:outline-none cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none ${
                isSigningOut ? 'opacity-60 cursor-wait' : ''
              }`}
            >
              {isSigningOut ? 'Signing out…' : 'Sign Out'}
            </button>
          )}

          {/* Separate Cancel Row */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSigningOut}
            className="w-full h-11 text-secondary text-[15px] font-medium flex items-center justify-center hover:opacity-80 active:opacity-60 transition-opacity focus:outline-none cursor-pointer disabled:opacity-40"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
