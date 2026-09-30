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
  const prevReadyRef = useRef<boolean>(false);

  if (!activeOutlet || !selectedRoute) return null;

  const totalCount = activeOutlet.products.length;
  const unpackedCount = activeOutlet.products.filter((p) => p.checked).length;
  const isAllChecked = totalCount > 0 && unpackedCount === totalCount;
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
    showToast(`Calling ${activeOutlet.managerName}…`);
  };

  const handleProceedToPin = () => {
    if (!isAllChecked) return;
    markUnpackingComplete(activeOutlet.id, true);
    track('M07');
    pushScreen('pin_confirmation');
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

        <ProductChecklist
          products={activeOutlet.products}
          outletId={activeOutlet.id}
          onToggleProduct={toggleProductCheck}
        />
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
          <span>{isAllChecked ? 'Unpacking Complete' : `${remainingCount} ${remainingCount === 1 ? 'item' : 'items'} left to unpack`}</span>
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
