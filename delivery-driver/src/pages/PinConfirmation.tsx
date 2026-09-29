import React, { useState, useEffect, useRef } from 'react';
import { useRoute } from '../state/routeContext';
import { useDriver } from '../state/driverContext';
import { TopBar } from '../components/TopBar';
import { SignalIndicator } from '../components/SignalIndicator';
import { ApprovalStatus } from '../components/ApprovalStatus';
import { PinBoxes } from '../components/PinBoxes';
import { Keypad } from '../components/Keypad';
import { SuccessMark } from '../components/SuccessMark';
import { verifyPin, PIN_LENGTH } from '../services/pinService';

interface PinConfirmationProps {
  onSuccess: () => void;
  onCancel: () => void;
  onBack?: () => void;
}

export const PinConfirmation: React.FC<PinConfirmationProps> = ({
  onSuccess,
  onCancel,
  onBack
}) => {
  const {
    routes,
    selectedRouteId,
    activeOutletId,
    activeOutlet,
    markOutletCompleted,
    setOutletConfirmation
  } = useRoute();

  const { gpsStatus } = useDriver();

  const handleReturn = onBack || onCancel;

  // Resolve current route & outlet
  const route =
    routes.find((r) => r.outlets.some((o) => o.id === activeOutletId)) ||
    routes.find((r) => r.id === selectedRouteId) ||
    routes[1] ||
    routes[0];

  const outlet =
    activeOutlet ||
    route?.outlets.find((o) => o.id === activeOutletId) ||
    route?.outlets[3] ||
    route?.outlets[0];

  // Redirect only if no outlet data can be found
  useEffect(() => {
    if (!outlet) {
      handleReturn();
    }
  }, [outlet, handleReturn]);

  // Read URL query params for state testing/simulation
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const simulatedState = searchParams?.get('state');
  const isOfflineParam = searchParams?.get('offline') === 'true' || simulatedState === 'offline';

  // Outlet confirmation state from server
  const confirmation = outlet?.confirmation || {
    approvalStatus: 'approved',
    attemptsLeft: 3,
    locked: false,
    expired: false
  };

  // Local state for PIN typing: PIN is NEVER kept in shared state or logged
  const [pin, setPin] = useState(() => (simulatedState === 'typing' ? '48' : ''));
  const [isVerifying, setIsVerifying] = useState(() => simulatedState === 'verifying');
  const [isWrong, setIsWrong] = useState(() => simulatedState === 'wrong');
  const [isLocked, setIsLocked] = useState(() => simulatedState === 'locked' || confirmation.locked);
  const [isExpired, setIsExpired] = useState(() => simulatedState === 'expired' || confirmation.expired);
  const [isSuccess, setIsSuccess] = useState(() => simulatedState === 'success');
  const [isOfflineSuccess, setIsOfflineSuccess] = useState(() => simulatedState === 'offline');
  const [message, setMessage] = useState(() => {
    if (simulatedState === 'wrong') return 'Incorrect PIN. 2 attempts left.';
    if (simulatedState === 'locked') return 'Too many attempts. Ask the store manager for a new PIN.';
    if (simulatedState === 'expired') return 'This PIN has expired. Ask the manager for a new one.';
    return '';
  });
  const [messageType, setMessageType] = useState<'normal' | 'critical'>(() =>
    simulatedState === 'wrong' ? 'critical' : 'normal'
  );

  const isRejected = confirmation.approvalStatus === 'rejected' || simulatedState === 'rejected';

  // Clear PIN state completely on unmount
  useEffect(() => {
    return () => {
      setPin('');
    };
  }, []);

  // Signal row: show ONLY when Network or GPS is Weak or Offline
  const isNetworkOffline = isOfflineParam;
  const isGpsWeakOrOffline =
    gpsStatus === 'off' ||
    gpsStatus === 'unavailable' ||
    gpsStatus === 'blocked' ||
    gpsStatus === 'requesting';
  const showSignal = isNetworkOffline || isGpsWeakOrOffline;

  // Handle digit press from custom keypad
  const handlePressDigit = (digit: string) => {
    if (isVerifying || isSuccess || isOfflineSuccess || isLocked || isRejected) return;
    if (pin.length >= PIN_LENGTH) return;

    // Clear previous error message if driver starts typing again
    if (messageType === 'critical') {
      setMessage('');
      setMessageType('normal');
    }

    const nextPin = pin + digit;
    setPin(nextPin);

    // When 4th digit is entered, submit automatically
    if (nextPin.length === PIN_LENGTH) {
      handleSubmitPin(nextPin);
    }
  };

  // Handle delete key
  const handleDelete = () => {
    if (isVerifying || isSuccess || isOfflineSuccess || isLocked || isRejected) return;
    if (pin.length === 0) return;

    if (messageType === 'critical') {
      setMessage('');
      setMessageType('normal');
    }
    setPin((prev) => prev.slice(0, -1));
  };

  // Submit and verify PIN
  const handleSubmitPin = async (enteredPin: string) => {
    setIsVerifying(true);
    setMessage('');
    setMessageType('normal');

    try {
      const { result, attemptsLeft } = await verifyPin(outlet?.id || 'fm-2-4', enteredPin, {
        isOffline: isNetworkOffline,
        isLocked,
        isExpired,
        attemptsLeft: confirmation.attemptsLeft
      });

      setIsVerifying(false);

      if (result === 'ok') {
        setIsSuccess(true);
        if (outlet) {
          markOutletCompleted(outlet.id, false);
        }
        // Navigate after 1.5 seconds
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else if (result === 'queued') {
        // Offline confirmation
        setIsOfflineSuccess(true);
        if (outlet) {
          markOutletCompleted(outlet.id, true);
        }
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else if (result === 'locked') {
        setIsLocked(true);
        setMessageType('normal');
        setMessage('Too many attempts. Ask the store manager for a new PIN.');
        if (outlet) {
          setOutletConfirmation(outlet.id, { locked: true, attemptsLeft: 0 });
        }
      } else if (result === 'expired') {
        setIsExpired(true);
        setPin('');
        setMessageType('normal');
        setMessage('This PIN has expired. Ask the manager for a new one.');
        if (outlet) {
          setOutletConfirmation(outlet.id, { expired: true });
        }
      } else {
        // Wrong PIN
        setIsWrong(true);
        setMessageType('critical');
        const attemptsMsg =
          attemptsLeft === 1
            ? 'Incorrect PIN. 1 attempt left.'
            : `Incorrect PIN. ${attemptsLeft} attempts left.`;
        setMessage(attemptsMsg);

        if (outlet) {
          setOutletConfirmation(outlet.id, { attemptsLeft });
        }

        // After 300ms shake ends; after 600ms clear boxes and re-enable keypad
        setTimeout(() => {
          setIsWrong(false);
          setPin('');
        }, 600);
      }
    } catch {
      setIsVerifying(false);
      setIsWrong(true);
      setMessageType('critical');
      setMessage('Incorrect PIN. Please try again.');
      setTimeout(() => {
        setIsWrong(false);
        setPin('');
      }, 600);
    }
  };

  if (!outlet) return null;

  const outletIndex = route?.outlets.findIndex((o) => o.id === outlet.id) ?? -1;
  const outletOrder = outletIndex >= 0 ? outletIndex + 1 : outlet.visitOrder || 4;
  const totalOutlets = route?.outlets.length || 14;
  const managerName = outlet.managerName || 'Nuwan Perera';
  const managerPhone = outlet.managerPhone || '077 123 4567';
  const sanitizedPhone = managerPhone.replace(/[^0-9+]/g, '');

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full max-w-[390px] min-h-[844px] h-screen bg-bg relative flex flex-col justify-between shadow-2xl border-x border-hairline/40 select-none overflow-hidden"
    >
      {/* 1. TopBar (Fleet Logistics centered, back returns to Market Detail) */}
      <TopBar
        title="Fleet Logistics"
        showBackButton={true}
        onBack={handleReturn}
        isScrolled={false}
      />

      {/* 2. Scrollable / Main Area */}
      <div className="flex-1 px-4 flex flex-col justify-between pt-2 pb-6 overflow-hidden">
        {/* Header Section */}
        <section aria-label="Confirm delivery header" className="w-full px-1 select-none space-y-1">
          {/* Small caption in secondary text: "Route 2 · Outlet 4 of 14" */}
          <p className="text-[13px] text-secondary leading-tight">
            Route <span className="font-mono tabular-nums">{route?.routeNumber || 2}</span> · Outlet{' '}
            <span className="font-mono tabular-nums">{outletOrder}</span> of{' '}
            <span className="font-mono tabular-nums">{totalOutlets}</span>
          </p>

          {/* Large title: "Confirm delivery" */}
          <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight mt-1">
            Confirm delivery
          </h1>

          {/* Secondary text */}
          <p className="text-[15px] text-secondary font-normal leading-tight mt-0.5">
            Ask the store manager for the PIN for{' '}
            <span className="text-success dark:text-[#2BD186] font-semibold">
              {outlet.city}
            </span>.
          </p>

          {/* Quiet manager line: "Nuwan Perera · Kandy" with "Call" button */}
          <div className="flex items-center justify-between pt-2 text-[15px] leading-tight">
            <span className="text-secondary truncate pr-2">
              <span className="text-black dark:text-white font-normal">{managerName}</span> ·{' '}
              <span className="text-success dark:text-[#2BD186] font-semibold">{outlet.city}</span>
            </span>
            <a
              href={`tel:${sanitizedPhone}`}
              className="text-action font-medium hover:opacity-80 active:opacity-60 transition-opacity shrink-0 py-0.5 focus:outline-none"
              aria-label={`Call ${managerName}`}
            >
              Call
            </a>
          </div>

          {/* 3. Approval status line (dot + short text, 14px) */}
          <div className="pt-2">
            <ApprovalStatus status={confirmation.approvalStatus} />
          </div>

          {/* 4. Signal row: shown ONLY when Network or GPS is Weak or Offline */}
          {showSignal && (
            <div className="pt-2">
              <SignalIndicator
                networkStatus={isNetworkOffline ? 'offline' : 'good'}
                gpsStatus={gpsStatus}
              />
            </div>
          )}
        </section>

        {/* Content Body: REJECTED state OR SUCCESS state OR PIN Entry */}
        {isRejected ? (
          /* 6. REJECTED: one card replacing boxes and keypad */
          <div className="w-full my-auto px-1 py-4 flex flex-col items-center select-none animate-fade-in">
            <div className="w-full bg-surface rounded-[20px] border border-hairline p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-critical/10 flex items-center justify-center text-critical mb-3">
                <svg
                  className="w-6 h-6 stroke-[2.5]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>

              <h2 className="text-[22px] font-semibold text-black dark:text-white leading-tight">
                Not approved
              </h2>

              <p className="text-[15px] text-secondary mt-1.5 leading-snug">
                {confirmation.rejectionReason || '2 items reported damaged'}
              </p>

              <button
                type="button"
                onClick={handleReturn}
                className="w-full h-[56px] rounded-[8px] bg-action text-white text-[17px] font-semibold mt-6 cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all"
              >
                Back to checklist
              </button>

              <a
                href={`tel:${sanitizedPhone}`}
                className="text-[15px] text-action font-medium mt-3.5 py-1 hover:opacity-80 active:opacity-60 transition-opacity"
              >
                Call store manager
              </a>
            </div>
          </div>
        ) : isSuccess || isOfflineSuccess ? (
          /* 3. SUCCESS / 7. OFFLINE SUCCESS: Center success mark */
          <div className="w-full my-auto">
            <SuccessMark
              isOffline={isOfflineSuccess}
              city={outlet.city}
            />
          </div>
        ) : (
          /* Standard PIN verification flow */
          <div className="w-full flex-1 flex flex-col justify-between py-2">
            {/* PIN boxes + Message Line (centered in available space) */}
            <div className="my-auto flex flex-col items-center justify-center">
              {/* Current store indicator in green */}
              <div className="flex items-center gap-1.5 mb-2 text-[14px] leading-tight select-none">
                <span className="text-secondary">Current store:</span>
                <span className="font-semibold text-success dark:text-[#2BD186] flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" aria-hidden="true" />
                  {outlet.city} ({route?.brandName || 'Waypoint'})
                </span>
              </div>

              {/* Demo UI Driver PIN Banner */}
              <div className="mb-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[12px] flex items-center gap-1.5 select-none">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                <span>Demo UI · Driver PIN: <strong className="font-mono font-bold text-[13px] text-black dark:text-white">4821</strong></span>
              </div>

              {/* 5. PIN Boxes */}
              <PinBoxes
                pin={pin}
                isWrong={isWrong}
                isVerifying={isVerifying}
                isLocked={isLocked}
              />

              {/* 6. Message line directly beneath boxes (fixed 40px height) */}
              <div
                role="status"
                aria-live="polite"
                className="w-full h-10 flex items-center justify-center text-center px-4 mt-2 select-none"
              >
                {isVerifying ? (
                  /* Small spinner replacing message line during verification */
                  <div
                    className="w-5 h-5 border-2 border-hairline border-t-action rounded-full animate-spin"
                    aria-label="Verifying PIN..."
                  />
                ) : message ? (
                  <p
                    className={`text-[14px] leading-tight font-normal ${
                      messageType === 'critical' ? 'text-critical' : 'text-secondary'
                    }`}
                  >
                    {message}
                  </p>
                ) : null}
              </div>

              {/* Locked Actions: disabled Try again placeholder + Call button */}
              {isLocked && (
                <div className="flex items-center gap-4 mt-1">
                  <button
                    type="button"
                    disabled
                    className="text-[14px] text-secondary cursor-not-allowed opacity-60"
                  >
                    Waiting for a new PIN
                  </button>
                  <span className="text-secondary text-[12px]">•</span>
                  <a
                    href={`tel:${sanitizedPhone}`}
                    className="text-[14px] text-action font-medium hover:underline"
                  >
                    Call
                  </a>
                </div>
              )}
            </div>

            {/* 7. Keypad pinned to the bottom above the safe area */}
            <footer className="w-full pb-2">
              <Keypad
                hasDigits={pin.length > 0}
                disabled={isVerifying || isLocked}
                isLocked={isLocked}
                onPressDigit={handlePressDigit}
                onDelete={handleDelete}
              />
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};
