// src/features/market-detail/components/MarketHeader.tsx - Market detail overview header and progress bar

import React from 'react';
import { Outlet, RoutePlan, PrototypeConditions } from '@/shared/types';
import { SignalIndicator } from '@/shared/components/ui';

export interface MarketHeaderProps {
  outlet: Outlet;
  route: RoutePlan;
  conditions: PrototypeConditions;
  unpackedCount: number;
  totalCount: number;
  isAllChecked: boolean;
  onCallManager: (e: React.MouseEvent) => void;
}

export const MarketHeader: React.FC<MarketHeaderProps> = ({
  outlet,
  route,
  conditions,
  unpackedCount,
  totalCount,
  isAllChecked,
  onCallManager
}) => {
  const percent = totalCount > 0 ? Math.round((unpackedCount / totalCount) * 100) : 0;

  return (
    <>
      <section aria-label="Outlet details header" className="w-full px-1 select-none space-y-1">
        <p className="text-[13px] text-secondary leading-tight">
          Route <span className="font-mono tabular-nums">{route.routeNumber}</span> · Outlet{' '}
          <span className="font-mono tabular-nums">{outlet.visitOrder}</span> of{' '}
          <span className="font-mono tabular-nums">{route.outlets.length}</span>
        </p>

        <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight mt-1">
          {outlet.city}
        </h1>

        <p className="text-[15px] text-secondary font-normal leading-tight mt-0.5">
          {route.brandName}
        </p>

        {/* Manager row */}
        <div className="flex items-center justify-between pt-1.5 text-[15px] leading-tight">
          <span className="text-secondary truncate pr-2">
            <span className="text-black dark:text-white font-normal">{outlet.managerName || 'Store manager'}</span>
            {outlet.managerPhone ? <>{' · '}<span className="font-mono tabular-nums">{outlet.managerPhone}</span></> : null}
          </span>
          <button
            type="button"
            onClick={onCallManager}
            className="text-action font-medium hover:opacity-80 active:opacity-60 transition-opacity shrink-0 py-0.5 focus:outline-none cursor-pointer"
          >
            Call
          </button>
        </div>
      </section>

      {/* Progress Bar */}
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

      {/* Signal Indicator Row */}
      <div className="px-1">
        <SignalIndicator
          networkStatus={conditions.networkStatus}
          gpsStatus={conditions.gpsStatus}
          gpsQuality={conditions.gpsQuality}
        />
      </div>
    </>
  );
};
