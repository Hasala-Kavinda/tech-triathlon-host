// app/src/components/screens/MarketDetail.tsx - Screen 3: Market Detail Unpacking Checklist

import React, { useState, useRef, useEffect } from 'react';
import { useStore } from '../../state/store';
import { TopBar } from '../shared/TopBar';
import { SignalIndicator } from '../shared/SignalIndicator';

export const MarketDetail: React.FC = () => {
  const {
    selectedRoute,
    activeOutlet,
    toggleProductCheck,
    markUnpackingComplete,
    pushScreen,
    popScreen,
    returnTo,
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

  // M03: Button disabled -> enabled accent ring pulse
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

  const percent = totalCount > 0 ? Math.round((unpackedCount / totalCount) * 100) : 0;

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
        {/* Outlet Header */}
        <section aria-label="Outlet details header" className="w-full px-1 select-none space-y-1">
          <p className="text-[13px] text-secondary leading-tight">
            Route <span className="font-mono tabular-nums">{selectedRoute.routeNumber}</span> · Outlet{' '}
            <span className="font-mono tabular-nums">{activeOutlet.visitOrder}</span> of{' '}
            <span className="font-mono tabular-nums">{selectedRoute.outlets.length}</span>
          </p>

          <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight mt-1">
            {activeOutlet.city}
          </h1>

          <p className="text-[15px] text-secondary font-normal leading-tight mt-0.5">
            {selectedRoute.brandName}
          </p>

          {/* Manager row */}
          <div className="flex items-center justify-between pt-1.5 text-[15px] leading-tight">
            <span className="text-secondary truncate pr-2">
              <span className="text-black dark:text-white font-normal">{activeOutlet.managerName}</span> ·{' '}
              <span className="font-mono tabular-nums">{activeOutlet.managerPhone}</span>
            </span>
            <button
              type="button"
              onClick={handleCallManager}
              className="text-action font-medium hover:opacity-80 active:opacity-60 transition-opacity shrink-0 py-0.5 focus:outline-none cursor-pointer"
            >
              Call
            </button>
          </div>
        </section>

        {/* Progress Bar (M02) */}
        <div className="space-y-1.5 px-1">
          <div
            role="progressbar"
            aria-valuenow={unpackedCount}
            aria-valuemin={0}
            aria-valuemax={totalCount}
            className="w-full h-1 bg-hairline/60 rounded-full overflow-hidden"
          >
            <div
              style={{ width: `${percent}%` }}
              className={`h-full rounded-full transition-all duration-300 ease-out ${
                isAllChecked ? 'bg-success' : 'bg-action'
              }`}
            />
          </div>
          <div className="flex items-center justify-between text-[13px] text-secondary tabular-nums font-normal">
            <span>
              {unpackedCount} of {totalCount} unpacked
            </span>
            <span>{percent}%</span>
          </div>
        </div>

        {/* Signal Indicator Row (M09) */}
        <div className="px-1">
          <SignalIndicator
            networkStatus={conditions.networkStatus}
            gpsStatus={conditions.gpsStatus}
            gpsQuality={conditions.gpsQuality}
          />
        </div>

        {/* Checklist */}
        <section aria-label="Unpacking checklist" className="w-full pt-1">
          <div className="bg-surface rounded-[20px] border border-hairline divide-y divide-hairline overflow-hidden shadow-sm">
            {activeOutlet.products.map((product) => {
              const isChecked = product.checked;

              return (
                <div
                  key={product.id}
                  onClick={() => toggleProductCheck(activeOutlet.id, product.id)}
                  className="min-h-[56px] px-4 py-2.5 flex items-center justify-between gap-3 cursor-pointer hover:bg-bg/40 active:bg-bg/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Checkbox Circle (120ms fill) */}
                    <div
                      className={`w-[26px] h-[26px] rounded-full flex items-center justify-center shrink-0 border transition-all duration-[120ms] ${
                        isChecked
                          ? 'bg-action border-action text-white shadow-sm'
                          : 'border-hairline bg-surface'
                      }`}
                    >
                      {isChecked && (
                        <span className="material-symbols-outlined text-[18px] leading-none animate-check-draw">
                          check
                        </span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p
                        className={`text-[17px] font-medium leading-tight truncate transition-colors duration-[120ms] ${
                          isChecked ? 'text-secondary' : 'text-black dark:text-white'
                        }`}
                      >
                        {product.name}
                      </p>
                      {product.chilled && (
                        <span className="text-[12px] text-action font-medium">Chilled storage</span>
                      )}
                    </div>
                  </div>

                  <span className="text-[15px] text-secondary font-mono tabular-nums shrink-0">
                    {product.quantity} {product.unit}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Pinned Bottom Bar */}
      <footer className="w-full bg-surface border-t border-hairline px-4 pt-3 pb-6 flex flex-col gap-1.5 shrink-0 z-20">
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
