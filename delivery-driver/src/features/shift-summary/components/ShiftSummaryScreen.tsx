// src/features/shift-summary/components/ShiftSummaryScreen.tsx - Shift Completion Summary screen

import React, { useState } from 'react';
import { useStore } from '@/state/store';
import {
  TopBar,
  CompletionMark,
  KeyFigures,
  SyncStatus,
  OutletSummaryList,
  EndShiftSheet,
  SignOutSheet,
  LogOutIcon
} from '@/shared/components/ui';
import { useShiftSummaryData } from '../hooks/useShiftSummaryData';

export const ShiftSummaryScreen: React.FC = () => {
  const { routes, replaceScreen, resetDemo, track } = useStore();
  const {
    finishedRoute,
    outlets,
    pendingCount,
    totalItems,
    otherRoutesRemain,
    animationStep,
    syncStatus,
    isSyncing,
    conditions,
    handleSyncNow
  } = useShiftSummaryData();

  const [isScrolled, setIsScrolled] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);

  const handleBackToPlan = () => {
    track('S04');
    replaceScreen('login');
  };

  const handleConfirmEndShift = () => {
    setIsSheetOpen(false);
    resetDemo();
    replaceScreen('login');
  };

  const isOffline = conditions.networkStatus === 'offline';

  return (
    <div className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none">
      <TopBar title="Fleet Logistics" showBackButton={false} isScrolled={isScrolled} />

      <div
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 4)}
        className="flex-1 px-4 overflow-y-auto pt-2 pb-36 space-y-5"
      >
        <div className="pt-2">
          <CompletionMark />
        </div>

        <div
          className="text-center space-y-1 transition-opacity duration-200"
          style={{ opacity: animationStep >= 1 ? 1 : 0 }}
        >
          <h1 className="text-[28px] font-bold text-black dark:text-white tracking-tight leading-tight">
            Route <span className="font-mono tabular-nums">{finishedRoute?.routeNumber ?? 2}</span> complete
          </h1>
          <p className="text-[15px] text-secondary font-normal tracking-tight">
            {finishedRoute?.brandName ?? 'Waypoint'} ·{' '}
            <span className="font-mono tabular-nums">
              {finishedRoute?.startedAt ?? '05:12'} to {finishedRoute?.finishedAt ?? '11:48'}
            </span>
          </p>
        </div>

        <div
          className="transition-opacity duration-200"
          style={{ opacity: animationStep >= 2 ? 1 : 0 }}
        >
          <KeyFigures
            outletsCount={outlets.length}
            itemsCount={totalItems}
            distanceKm={finishedRoute?.distanceKm ?? 42}
            totalTime="6h 36m"
          />
        </div>

        <div
          className="pt-1 transition-opacity duration-200"
          style={{ opacity: animationStep >= 3 ? 1 : 0 }}
        >
          <SyncStatus
            status={syncStatus}
            pendingCount={pendingCount}
            onSyncNow={handleSyncNow}
            networkStatus={conditions.networkStatus === 'good' ? 'good' : 'offline'}
            gpsStatus={conditions.gpsStatus}
          />
        </div>

        <div
          className="transition-opacity duration-200"
          style={{ opacity: animationStep >= 4 ? 1 : 0 }}
        >
          <OutletSummaryList
            outlets={outlets}
            initialExpanded={false}
          />
        </div>
      </div>

      <footer
        className={`w-full max-w-[500px] absolute bottom-0 left-0 right-0 mx-auto bg-bg px-4 pt-3 flex flex-col gap-2 z-30 transition-all ${
          isScrolled ? 'border-t border-hairline' : 'border-t border-transparent'
        }`}
        style={{
          paddingBottom: 'max(28px, calc(16px + env(safe-area-inset-bottom, 0px)))'
        }}
      >
        {otherRoutesRemain ? (
          <>
            <button
              type="button"
              onClick={handleBackToPlan}
              className="w-full h-14 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-semibold text-[16px] flex items-center justify-center shadow-sm transition-all focus:outline-none cursor-pointer"
            >
              Back to today&apos;s plan
            </button>

            <button
              type="button"
              onClick={() => {
                track('S05');
                setIsSheetOpen(true);
              }}
              className="w-full h-11 text-secondary text-[15px] font-medium flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
            >
              End shift
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              track('S05');
              setIsSheetOpen(true);
            }}
            className="w-full h-14 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-semibold text-[16px] flex items-center justify-center shadow-sm transition-all focus:outline-none cursor-pointer"
          >
            End shift
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsSignOutOpen(true)}
          aria-label="Sign out"
          data-testid="sign-out-button"
          className="w-full min-h-[44px] text-secondary hover:text-black dark:hover:text-white active:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action rounded-lg text-[14px] font-medium flex items-center justify-center gap-1.5 transition-colors cursor-pointer select-none"
        >
          <LogOutIcon className="w-4 h-4 text-current shrink-0" />
          <span>Sign out</span>
        </button>
      </footer>

      <EndShiftSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onConfirmEndShift={handleConfirmEndShift}
        unsyncedCount={pendingCount}
      />

      <SignOutSheet
        isOpen={isSignOutOpen}
        onClose={() => setIsSignOutOpen(false)}
        pendingSyncCount={pendingCount}
        isOffline={isOffline}
        isRouteInProgress={routes.some((r) => r.status === 'in_progress')}
        onSyncNow={handleSyncNow}
        isSyncing={isSyncing}
        onPerformReset={resetDemo}
      />
    </div>
  );
};
