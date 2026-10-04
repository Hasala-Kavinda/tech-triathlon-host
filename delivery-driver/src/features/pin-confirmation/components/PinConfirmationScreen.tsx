// src/features/pin-confirmation/components/PinConfirmationScreen.tsx - Screen 4: 4-digit PIN delivery verification

import React from 'react';
import { useStore } from '@/state/store';
import { TopBar } from '@/shared/components/ui';
import type { StopOutcome } from '@/shared/types';
import { isDemoMode } from '@/shared/lib/demo';
import { usePinVerification } from '../hooks/usePinVerification';
import { PinHeader } from './PinHeader';
import { PinBoxes } from './PinBoxes';
import { CustomKeypad } from './CustomKeypad';

const OUTCOME_CHOICES: Array<{ value: StopOutcome; label: string }> = [
  { value: 'delivered', label: 'Delivered' },
  { value: 'partial', label: 'Partial' },
  { value: 'refused', label: 'Refused' },
  { value: 'closed', label: 'Closed' }
];

export const PinConfirmationScreen: React.FC = () => {
  const { selectedRoute, activeOutlet, showToast, pushScreen, track } = useStore();
  const {
    pin,
    isVerifying,
    isWrong,
    isSuccess,
    isOfflineSaved,
    isLocked,
    errorMessage,
    isRejected,
    isExpired,
    outcome,
    setOutcome,
    needsPin,
    hasIssues,
    completeWithoutPin,
    handleDigitPress,
    handleDelete,
    handleBack
  } = usePinVerification();

  const callManager = () => {
    showToast(activeOutlet?.managerName ? `Calling ${activeOutlet.managerName}…` : "The store manager's number is not available in the app.");
  };

  if (!activeOutlet || !selectedRoute) return null;

  return (
    <div className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none">
      <TopBar
        title="Fleet Logistics"
        showBackButton={true}
        onBack={handleBack}
      />

      <div
        className="flex-1 px-4 flex flex-col justify-between pt-2 overflow-hidden"
        style={{ paddingBottom: 'max(24px, calc(16px + env(safe-area-inset-bottom, 0px)))' }}
      >
        <PinHeader
          outlet={activeOutlet}
          route={selectedRoute}
          onCall={callManager}
        />

        {isRejected ? (
          <div className="w-full my-auto px-1 py-4 flex flex-col items-center select-none animate-row-enter">
            <div className="w-full bg-surface rounded-[20px] border border-hairline p-6 shadow-sm flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-critical/10 flex items-center justify-center text-critical mb-3">
                <span className="material-symbols-outlined text-[28px]">error</span>
              </div>
              <h2 className="text-[22px] font-semibold text-black dark:text-white leading-tight">
                Not approved
              </h2>
              <p className="text-[15px] text-secondary mt-1.5 leading-snug">
                {activeOutlet.confirmation.rejectionReason || 'The store did not approve this delivery.'}
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
                onClick={callManager}
                className="text-[15px] text-action font-medium mt-3.5 py-1 hover:opacity-80 active:opacity-60 transition-opacity cursor-pointer"
              >
                Call store manager
              </button>
            </div>
          </div>
        ) : isSuccess || isOfflineSaved ? (
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
          <div className="w-full flex-1 flex flex-col justify-between py-2">
            <div className="my-auto flex flex-col items-center justify-center">
              <div className="flex items-center gap-1.5 mb-2 text-[14px] leading-tight select-none">
                <span className="text-secondary">Current store:</span>
                <span className="font-semibold text-success flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                  {activeOutlet.city} ({selectedRoute.brandName})
                </span>
              </div>

              {isDemoMode() && (
                <div className="mb-3 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 text-[12px] flex items-center gap-1.5 select-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span>Demo UI · Driver PIN: <strong className="font-mono font-bold text-[13px] text-black dark:text-white">4821</strong></span>
                </div>
              )}

              <div role="radiogroup" aria-label="How did this stop end?" className="w-full flex flex-wrap justify-center gap-2 mb-3">
                {OUTCOME_CHOICES.map((choice) => {
                  const selected = outcome === choice.value;
                  const blocked = choice.value === 'delivered' && hasIssues;
                  return (
                    <button
                      key={choice.value}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setOutcome(choice.value)}
                      className={`h-9 px-3.5 rounded-full text-[14px] font-semibold border transition-colors cursor-pointer ${
                        selected ? 'bg-action text-white border-action' : 'bg-surface text-black dark:text-white border-hairline'
                      } ${blocked ? 'opacity-40' : ''}`}
                    >
                      {choice.label}
                    </button>
                  );
                })}
              </div>

              {!needsPin ? (
                <div className="w-full px-2 py-3 text-center flex flex-col items-center gap-3">
                  <p className="text-[15px] text-secondary leading-snug">
                    {outcome === 'closed' ? 'The store is closed.' : 'The store refused the delivery.'} No PIN is needed.
                    Nothing is delivered and every item is recorded as not delivered.
                  </p>
                  <button
                    type="button"
                    onClick={completeWithoutPin}
                    disabled={isVerifying}
                    className="w-full h-[52px] rounded-xl bg-action text-white text-[16px] font-semibold cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
                  >
                    {isVerifying ? 'Saving…' : `Complete stop as ${outcome === 'closed' ? 'closed' : 'refused'}`}
                  </button>
                  {errorMessage ? <p className="text-[14px] text-critical">{errorMessage}</p> : null}
                </div>
              ) : (
                <PinBoxes pin={pin} isWrong={isWrong} />
              )}

              <div className="w-full h-10 flex items-center justify-center text-center px-4 mt-2">
                {isVerifying ? (
                  <div className="w-5 h-5 border-2 border-hairline border-t-action rounded-full animate-spin" />
                ) : errorMessage ? (
                  <p className={`text-[14px] font-normal ${isWrong ? 'text-critical' : 'text-secondary'}`}>
                    {errorMessage}
                  </p>
                ) : isExpired ? (
                  <p className="text-[14px] text-attention font-medium">
                    This PIN has expired. Ask the manager for a new one.
                  </p>
                ) : null}
              </div>
            </div>

            {needsPin ? (
              <CustomKeypad
                isDisabled={isVerifying || isLocked}
                onDigitPress={handleDigitPress}
                onDelete={handleDelete}
              />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};
