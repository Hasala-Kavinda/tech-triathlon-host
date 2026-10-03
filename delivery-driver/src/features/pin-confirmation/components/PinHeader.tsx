// src/features/pin-confirmation/components/PinHeader.tsx - Confirm delivery header block

import React from 'react';
import { Outlet, RoutePlan } from '@/shared/types';

export interface PinHeaderProps {
  outlet: Outlet;
  route: RoutePlan;
  onCall: () => void;
}

export const PinHeader: React.FC<PinHeaderProps> = ({ outlet, route, onCall }) => {
  const confirmation = outlet.confirmation;

  return (
    <section aria-label="Confirm delivery header" className="w-full px-1 select-none space-y-1">
      <p className="text-[13px] text-secondary leading-tight">
        Route <span className="font-mono tabular-nums">{route.routeNumber}</span> · Outlet{' '}
        <span className="font-mono tabular-nums">{outlet.visitOrder}</span> of{' '}
        <span className="font-mono tabular-nums">{route.outlets.length}</span>
      </p>

      <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight mt-1">
        Confirm delivery
      </h1>

      <p className="text-[15px] text-secondary font-normal leading-tight mt-0.5">
        Ask the store manager for the PIN for{' '}
        <span className="text-success font-semibold">{outlet.city}</span>.
      </p>

      {/* Manager row */}
      <div className="flex items-center justify-between pt-1.5 text-[15px] leading-tight">
        <span className="text-secondary truncate pr-2">
          <span className="text-black dark:text-white font-normal">{outlet.managerName || 'Store manager'}</span> ·{' '}
          <span className="text-success font-semibold">{outlet.city}</span>
        </span>
        <button
          type="button"
          onClick={onCall}
          className="text-action font-medium hover:opacity-80 active:opacity-60 transition-opacity shrink-0 py-0.5 focus:outline-none cursor-pointer"
        >
          Call
        </button>
      </div>

      {/* Approval Line */}
      <div className="pt-2 flex items-center gap-2 text-[14px] leading-tight">
        {confirmation.approvalStatus === 'approved' ? (
          <span className="inline-flex items-center gap-1.5 text-success font-medium">
            <span className="w-2 h-2 rounded-full bg-success" />
            Approved by manager
          </span>
        ) : confirmation.approvalStatus === 'rejected' ? (
          <span className="inline-flex items-center gap-1.5 text-critical font-medium">
            <span className="w-2 h-2 rounded-full bg-critical" />
            Checklist not approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-secondary">
            <span className="w-2 h-2 rounded-full bg-pending" />
            Waiting for store manager PIN
          </span>
        )}
      </div>
    </section>
  );
};
