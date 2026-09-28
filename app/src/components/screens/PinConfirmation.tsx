// app/src/components/screens/PinConfirmation.tsx - Screen 4: 4-digit PIN delivery verification

import React, { useState, useEffect } from 'react';
import { useStore } from '../../state/store';
import { TopBar } from '../shared/TopBar';
import { SignalIndicator } from '../shared/SignalIndicator';

export const PinConfirmation: React.FC = () => {
  const {
    selectedRoute,
    activeOutlet,
    completeOutlet,
    replaceScreen,
    popScreen,
    pushScreen,
    conditions,
    showToast,
    track
  } = useStore();

  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isLocked, setIsLocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!activeOutlet || !selectedRoute) return null;

  const confirmation = activeOutlet.confirmation;
  const isRejected = confirmation.approvalStatus === 'rejected';
  const isExpired = confirmation.expired;

  // React to panel locked / issue new PIN changes
  useEffect(() => {
    if (!confirmation.locked && isLocked) {
      setIsLocked(false);
      setAttemptsLeft(3);
      setErrorMessage('');
      setPin('');
    }
  }, [confirmation.locked, isLocked]);

  const handleBack = () => {
    track('P08');
    setPin('');
    popScreen();
  };

  const handleDigitPress = (digit: string) => {
    if (isVerifying || isSuccess || isOfflineSaved || isLocked || isRejected || isExpired) return;

    track('P01');
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const nextPin = prev + digit;
      if (nextPin.length === 4) {
        track('P02');
        submitPin(nextPin);
      }
      return nextPin;
    });
  };

  const handleDelete = () => {
    if (isVerifying || isSuccess || isOfflineSaved || isLocked) return;
    setPin((prev) => prev.slice(0, -1));
  };

  const submitPin = (enteredPin: string) => {
    setIsVerifying(true);
    setErrorMessage('');

    setTimeout(() => {
      setIsVerifying(false);

      if (enteredPin === '4821') {
        // P05 or P06 Offline saved
        if (conditions.nextPinResult === 'offline-saved' || conditions.networkStatus === 'offline') {
          setIsOfflineSaved(true);
          completeOutlet(activeOutlet.id, true);
          track('P06');
          setTimeout(() => {
            replaceScreen('shift_summary');
          }, 1500);
        } else {
          setIsSuccess(true);
          completeOutlet(activeOutlet.id, false);
          track('P05');
          setTimeout(() => {
            replaceScreen('shift_summary');
          }, 1500);
        }
      } else {
        // Wrong PIN
        const nextAttempts = attemptsLeft - 1;
        setAttemptsLeft(nextAttempts);

        if (nextAttempts <= 0) {
          setIsLocked(true);
          track('P04');
          setErrorMessage('Waiting for a new PIN');
        } else {
          setIsWrong(true);
          track('P03');
          setErrorMessage(`Incorrect PIN. ${nextAttempts} ${nextAttempts === 1 ? 'attempt' : 'attempts'} left.`);
          setTimeout(() => {
            setIsWrong(false);
            setPin('');
          }, 600);
        }
      }
    }, 800);
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none">
      <TopBar
        title="Fleet Logistics"
        showBackButton={true}
        onBack={handleBack}
      />

      {/* Main Content Area */}
      <div className="flex-1 px-4 flex flex-col justify-between pt-2 pb-6 overflow-hidden">
        {/* Header Block */}
        <section aria-label="Confirm delivery header" className="w-full px-1 select-none space-y-1">
          <p className="text-[13px] text-secondary leading-tight">
            Route <span className="font-mono tabular-nums">{selectedRoute.routeNumber}</span> · Outlet{' '}
            <span className="font-mono tabular-nums">{activeOutlet.visitOrder}</span> of{' '}
            <span className="font-mono tabular-nums">{selectedRoute.outlets.length}</span>
          </p>

          <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight mt-1">
            Confirm delivery
          </h1>

          <p className="text-[15px] text-secondary font-normal leading-tight mt-0.5">
            Ask the store manager for the PIN for{' '}
            <span className="text-success font-semibold">{activeOutlet.city}</span>.
          </p>

          {/* Manager row */}
          <div className="flex items-center justify-between pt-1.5 text-[15px] leading-tight">
            <span className="text-secondary truncate pr-2">
              <span className="text-black dark:text-white font-normal">{activeOutlet.managerName}</span> ·{' '}
              <span className="text-success font-semibold">{activeOutlet.city}</span>
            </span>
            <button
              type="button"
              onClick={() => showToast(`Calling ${activeOutlet.managerName}…`)}
              className="text-action font-medium hover:opacity-80 active:opacity-60 transition-opacity shrink-0 py-0.5 focus:outline-none cursor-pointer"
            >
              Call
            </button>
          </div>

          {/* P07 Approval Line */}
          <div className="pt-2 flex items-center gap-2 text-[14px] leading-tight">
            {confirmation.approvalStatus === 'approved' ? (
              <div className="flex items-center gap-1.5 text-success font-medium animate-row-enter">
                <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                <span>Approved. Ask for the PIN.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-secondary">
                <span className="w-2 h-2 rounded-full bg-secondary/50 animate-pulse shrink-0" />
                <span>Waiting for the store manager</span>
              </div>
            )}
          </div>

          {/* Signal Indicator Row */}
          <div className="pt-2">
            <SignalIndicator
              networkStatus={conditions.networkStatus}
              gpsStatus={conditions.gpsStatus}
              gpsQuality={conditions.gpsQuality}
            />
          </div>
        </section>

        {/* Center Body: Rejected Card OR Success Mark OR Pin Entry */}
        {isRejected ? (
          /* Rejected state */
          <div className="w-full my-auto px-1 py-4 flex flex-col items-center select-none animate-row-enter">
            <div className="w-full bg-surface rounded-[20px] border border-hairline p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-critical/10 flex items-center justify-center text-critical mb-3">
                <span className="material-symbols-outlined text-[28px]">error</span>
              </div>
              <h2 className="text-[22px] font-semibold text-black dark:text-white leading-tight">
                Not approved
              </h2>
              <p className="text-[15px] text-secondary mt-1.5 leading-snug">
                {confirmation.rejectionReason || '2 items reported damaged'}
              </p>
              <button
                type="button"
                onClick={() => {
                  track('P06');
                  pushScreen('market_detail');
                }}
                className="w-full h-[52px] rounded-xl bg-action text-white text-[16px] font-semibold mt-6 cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all"
              >
                Back to checklist
              </button>
              <button
                type="button"
                onClick={() => showToast(`Calling ${activeOutlet.managerName}…`)}
                className="text-[15px] text-action font-medium mt-3.5 py-1 hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer"
              >
                Call store manager
              </button>
            </div>
          </div>
        ) : isSuccess || isOfflineSaved ? (
          /* Success Mark (P05 & P06) */
          <div className="w-full my-auto flex flex-col items-center justify-center text-center py-6 animate-row-enter">
            <div
              className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                isOfflineSaved ? 'bg-attention/20 text-attention' : 'bg-success/20 text-success'
              }`}
            >
              <span className="material-symbols-outlined text-[36px] animate-check-draw">
                check
              </span>
            </div>
            <h2 className="text-[24px] font-bold text-black dark:text-white tracking-tight">
              {isOfflineSaved ? 'Saved on this phone' : 'Delivery confirmed'}
            </h2>
            <p className="text-[15px] text-secondary mt-1">
              {isOfflineSaved
                ? 'Delivery recorded offline. Will sync once network returns.'
                : `${activeOutlet.city} completed`}
            </p>
          </div>
        ) : (
          /* PIN Input Flow */
          <div className="w-full flex-1 flex flex-col justify-between py-2">
            <div className="my-auto flex flex-col items-center justify-center">
              {/* Store tag */}
              <div className="flex items-center gap-1.5 mb-3 text-[14px] leading-tight select-none">
                <span className="text-secondary">Current store:</span>
                <span className="font-semibold text-success flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                  {activeOutlet.city} ({selectedRoute.brandName})
                </span>
              </div>

              {/* 4 Pin Boxes (120ms digit scale) */}
              <div
                className={`flex items-center justify-center gap-3.5 my-2 ${
                  isWrong ? 'animate-pin-shake' : ''
                }`}
              >
                {[0, 1, 2, 3].map((i) => {
                  const digit = pin[i] || '';
                  const isCurrent = pin.length === i && !isVerifying;

                  return (
                    <div
                      key={i}
                      className={`w-[60px] h-[72px] rounded-2xl bg-surface flex items-center justify-center text-[28px] font-bold font-mono tabular-nums text-black dark:text-white border transition-all duration-150 ${
                        isCurrent
                          ? 'border-2 border-action ring-4 ring-action/20'
                          : isWrong
                          ? 'border-critical text-critical'
                          : isLocked
                          ? 'border-hairline opacity-50'
                          : 'border-hairline'
                      }`}
                    >
                      <span className={digit ? 'animate-row-enter' : ''}>
                        {digit}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Verification Spinner / Error Message */}
              <div className="w-full h-10 flex items-center justify-center text-center px-4 mt-2">
                {isVerifying ? (
                  <div className="w-5 h-5 border-2 border-hairline border-t-action rounded-full animate-spin" />
                ) : errorMessage ? (
                  <p
                    className={`text-[14px] font-normal ${
                      isWrong ? 'text-critical' : 'text-secondary'
                    }`}
                  >
                    {errorMessage}
                  </p>
                ) : isExpired ? (
                  <p className="text-[14px] text-attention font-medium">
                    This PIN has expired. Ask the manager for a new one.
                  </p>
                ) : null}
              </div>
            </div>

            {/* Custom 10-Digit Keypad */}
            <footer className="w-full pb-2">
              <div
                className={`grid grid-cols-3 gap-2.5 max-w-[320px] mx-auto transition-opacity ${
                  isVerifying || isLocked ? 'opacity-40 pointer-events-none' : 'opacity-100'
                }`}
              >
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleDigitPress(digit)}
                    className="h-14 rounded-2xl bg-surface border border-hairline shadow-sm text-[24px] font-semibold text-black dark:text-white font-mono tabular-nums flex items-center justify-center active:scale-95 active:bg-hairline/40 transition-all cursor-pointer"
                  >
                    {digit}
                  </button>
                ))}
                <div />
                <button
                  type="button"
                  onClick={() => handleDigitPress('0')}
                  className="h-14 rounded-2xl bg-surface border border-hairline shadow-sm text-[24px] font-semibold text-black dark:text-white font-mono tabular-nums flex items-center justify-center active:scale-95 active:bg-hairline/40 transition-all cursor-pointer"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  aria-label="Delete digit"
                  className="h-14 rounded-2xl bg-surface border border-hairline shadow-sm text-[20px] text-secondary flex items-center justify-center active:scale-95 active:bg-hairline/40 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[24px]">backspace</span>
                </button>
              </div>
            </footer>
          </div>
        )}
      </div>
    </div>
  );
};
