import React from 'react';
import { Outlet } from '../state/routeContext';

export interface UpNextCardProps {
  outlet?: Outlet | null;
  allCompleted?: boolean;
  onOpen: (outlet: Outlet) => void;
}

export const UpNextCard: React.FC<UpNextCardProps> = ({
  outlet,
  allCompleted = false,
  onOpen
}) => {
  if (allCompleted || !outlet) {
    return (
      <section
        aria-label="All outlets completed"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
        }}
        className="w-full bg-surface rounded-[20px] border border-hairline p-5 flex items-center gap-3.5 select-none"
      >
        <div className="w-10 h-10 rounded-full bg-gps-tint flex items-center justify-center shrink-0">
          <span
            className="material-symbols-outlined text-[22px] text-success"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
        </div>
        <div>
          <h2 className="text-[17px] font-semibold text-black dark:text-white tracking-tight">
            All stops completed
          </h2>
          <p className="text-[13px] text-secondary mt-0.5">
            Swipe the bar below to finish your route.
          </p>
        </div>
      </section>
    );
  }

  const isCurrent = outlet.status === 'in_progress';
  const label = isCurrent ? 'CURRENT OUTLET' : 'UP NEXT';
  const actionText = isCurrent ? 'Continue delivery' : 'Start delivery';

  return (
    <section
      aria-label="Up next outlet"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full bg-surface rounded-[20px] border border-hairline p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none"
    >
      {/* 1. Section Label with optional live in-progress indicator */}
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-semibold text-secondary uppercase tracking-wider block">
          {label}
        </span>
        {isCurrent && (
          <span className="w-1.5 h-1.5 rounded-full bg-action animate-pulse" />
        )}
      </div>

      {/* 2. Sequence + City Name */}
      <div className="flex items-center gap-2 mt-1">
        {outlet.visitOrder && (
          <span className="w-6 h-6 rounded-full bg-hairline/80 text-secondary dark:text-white text-[11px] font-bold font-mono flex items-center justify-center shrink-0">
            {outlet.visitOrder}
          </span>
        )}
        <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight leading-snug truncate">
          {outlet.city}
        </h2>
      </div>

      {/* 3. Items count + Manager info */}
      <p className="text-[15px] text-secondary font-normal mt-0.5 tabular-nums truncate">
        {outlet.itemCount} items to deliver
        {outlet.managerName ? ` · ${outlet.managerName}` : ''}
      </p>

      {/* 4. Primary Action Button with contextual text */}
      <button
        type="button"
        onClick={() => onOpen(outlet)}
        className="w-full h-12 mt-3.5 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-medium text-[16px] flex items-center justify-center gap-1.5 shadow-sm transition-all focus:outline-none"
      >
        <span>{actionText}</span>
        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
      </button>
    </section>
  );
};
