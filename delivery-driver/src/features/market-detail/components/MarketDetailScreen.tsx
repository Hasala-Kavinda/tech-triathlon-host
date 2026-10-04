// src/features/market-detail/components/MarketDetailScreen.tsx - Market Detail Unpacking Checklist screen

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '@/state/store';
import { TopBar } from '@/shared/components/ui';
import { MarketHeader } from './MarketHeader';
import { ProductChecklist } from './ProductChecklist';

export const MarketDetailScreen: React.FC = () => {
  const {
    selectedRoute,
    activeOutlet,
    toggleProductCheck,
    setProductIssue,
    arriveAtOutlet,
    markUnpackingComplete,
    pushScreen,
    popScreen,
    conditions,
    showToast,
    track
  } = useStore();

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolledFromTop, setIsScrolledFromTop] = useState(false);
  const [buttonPulse, setButtonPulse] = useState(false);
  const [isArriving, setIsArriving] = useState(false);
  const prevReadyRef = useRef<boolean>(false);

  if (!activeOutlet || !selectedRoute) return null;

  const totalCount = activeOutlet.products.length;
  const unpackedCount = activeOutlet.products.filter((p) => p.checked).length;
  const isArrived = !!activeOutlet.arrived;
  const isAllChecked = isArrived && totalCount > 0 && unpackedCount === totalCount;
  const remainingCount = totalCount - unpackedCount;

  useEffect(() => {
    if (isAllChecked && !prevReadyRef.current) {
      setButtonPulse(true);
      track('M03');
      const timer = setTimeout(() => setButtonPulse(false), 500);
      return () => clearTimeout(timer);
    }
    if (!isAllChecked && prevReadyRef.current) {
      track('M04');
    }
    prevReadyRef.current = isAllChecked;
  }, [isAllChecked, track]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const st = e.currentTarget.scrollTop;
    setIsScrolledFromTop(st > 4);
    if (st > 10) track('M08');
  };

  const handleBack = () => {
    track('M06');
    popScreen();
  };

  const handleCallManager = (e: React.MouseEvent) => {
    e.preventDefault();
    track('M05');
    showToast(activeOutlet.managerName ? `Calling ${activeOutlet.managerName}…` : "The store manager's number is not available in the app.");
  };

  // Arrival is its own step: it stamps the time with the server (or on the phone when offline).
  const handleArrived = async () => {
    setIsArriving(true);
    try {
      await arriveAtOutlet(activeOutlet.id);
      showToast(navigator.onLine ? 'Arrival recorded' : 'Arrival saved on this phone');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to record arrival.');
    } finally {
      setIsArriving(false);
    }
  };

  const handleProceedToPin = async () => {
    if (!isAllChecked) return;
    try {
      await markUnpackingComplete(activeOutlet.id, true);
      track('M07');
      pushScreen('pin_confirmation');
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to record arrival.');
    }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none">
      <TopBar
        title="Fleet Logistics"
        showBackButton={true}
        onBack={handleBack}
        isScrolled={isScrolledFromTop}
      />

      {/* Main Content Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 px-4 space-y-4 pt-2 overflow-y-auto"
        style={{ paddingBottom: 'max(24px, calc(16px + env(safe-area-inset-bottom, 0px)))' }}
      >
        <MarketHeader
          outlet={activeOutlet}
          route={selectedRoute}
          conditions={conditions}
          unpackedCount={unpackedCount}
          totalCount={totalCount}
          isAllChecked={isAllChecked}
          onCallManager={handleCallManager}
        />

        {isArrived ? (
          <ProductChecklist
            products={activeOutlet.products}
            outletId={activeOutlet.id}
            onToggleProduct={toggleProductCheck}
            onSetIssue={setProductIssue}
          />
        ) : (
          <section aria-label="Confirm arrival" className="w-full bg-surface rounded-[20px] border border-hairline p-5 text-center shadow-sm">
            <h2 className="text-[20px] font-semibold text-black dark:text-white leading-tight">Have you arrived?</h2>
            <p className="text-[15px] text-secondary mt-1.5 leading-snug">
              Confirm when you reach {activeOutlet.city}. This records your arrival time. Then you can unpack and check the items.
            </p>
            <button
              type="button"
              onClick={handleArrived}
              disabled={isArriving}
              className="w-full h-[52px] rounded-xl bg-action text-white text-[16px] font-semibold mt-4 cursor-pointer hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
            >
              {isArriving ? 'Recording…' : "I've arrived"}
            </button>
          </section>
        )}
      </div>

      {/* Pinned Bottom Bar */}
      <footer
        className="w-full bg-surface border-t border-hairline px-4 pt-3 flex flex-col gap-1.5 shrink-0 z-20"
        style={{ paddingBottom: 'max(24px, calc(10px + env(safe-area-inset-bottom, 0px)))' }}
      >
        <button
          type="button"
          onClick={handleProceedToPin}
          disabled={!isAllChecked}
          className={`w-full h-12 rounded-xl text-[16px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 ${
            isAllChecked
              ? 'bg-action text-white shadow-sm hover:opacity-95 active:scale-[0.99] cursor-pointer'
              : 'bg-hairline/60 text-secondary cursor-not-allowed opacity-70'
          } ${buttonPulse ? 'ring-4 ring-action/30' : ''}`}
        >
          <span>{!isArrived ? 'Confirm your arrival first' : isAllChecked ? 'Unpacking Complete' : `${remainingCount} ${remainingCount === 1 ? 'item' : 'items'} left to unpack`}</span>
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>

        {isAllChecked && (
          <p className="text-[13px] text-secondary text-center leading-tight pt-0.5 animate-row-enter">
            Next: Store manager enters 4-digit verification PIN
          </p>
        )}
      </footer>
    </div>
  );
};
