// src/features/dashboard/components/StopTimeline.tsx - Sequence list with vertical timeline connectors

import React from 'react';
import { Outlet } from '@/shared/types';

export interface StopTimelineProps {
  outlets: Outlet[];
  totalOutletsCount: number;
  onOpenMarket: (outlet: Outlet) => void;
}

export const StopTimeline: React.FC<StopTimelineProps> = ({
  outlets,
  totalOutletsCount,
  onOpenMarket
}) => {
  return (
    <section
      aria-label="All outlets in route"
      className="w-full bg-surface rounded-[20px] border border-hairline shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none overflow-hidden animate-row-enter"
      style={{ animationDelay: '80ms' }}
    >
      <div className="px-4 py-3.5 flex items-center justify-between border-b-[0.5px] border-hairline">
        <h3 className="text-[17px] font-semibold text-black dark:text-white tracking-tight leading-none">
          Outlets
        </h3>
        <span className="text-[15px] text-secondary font-mono tabular-nums font-normal">
          {totalOutletsCount}
        </span>
      </div>

      <div className="divide-y-[0.5px] divide-hairline">
        {outlets.map((outlet, index) => {
          const isFirst = index === 0;
          const isLast = index === outlets.length - 1;
          const isDone = outlet.status === 'completed';
          const isInProg = outlet.status === 'in_progress';

          return (
            <div
              key={outlet.id}
              onClick={() => !isDone && onOpenMarket(outlet)}
              className={`relative flex items-stretch min-h-[56px] transition-colors ${
                isDone ? 'opacity-60 cursor-default' : 'hover:bg-bg/40 active:bg-bg/80 cursor-pointer'
              }`}
            >
              {/* Sequence Column */}
              <div className="w-14 relative flex items-center justify-center shrink-0">
                {!isFirst && (
                  <div className="absolute top-0 bottom-1/2 left-1/2 -translate-x-1/2 w-[1px] bg-hairline pointer-events-none" />
                )}
                {!isLast && (
                  <div className="absolute top-1/2 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-hairline pointer-events-none" />
                )}
                <div
                  className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-mono tabular-nums border transition-colors ${
                    isDone
                      ? 'bg-success/10 border-success/30 text-success'
                      : isInProg
                      ? 'bg-action/10 border-action/40 text-action font-semibold'
                      : 'bg-bg border-hairline text-secondary'
                  }`}
                >
                  {index + 1}
                </div>
              </div>

              {/* Outlet Details */}
              <div className="flex-1 py-2.5 pr-4 flex items-center justify-between min-w-0">
                <div className="min-w-0 pr-2">
                  <p className="text-[17px] font-medium text-black dark:text-white leading-tight truncate">
                    {outlet.city}
                  </p>
                  <p className="text-[13px] text-secondary font-normal mt-0.5 tabular-nums">
                    {outlet.itemCount} items
                  </p>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 transition-colors duration-200 ${
                      isDone ? 'bg-success' : isInProg ? 'bg-action' : 'bg-secondary/40'
                    }`}
                  />
                  <span className="text-[13px] text-secondary font-normal transition-colors duration-200">
                    {isDone ? 'Completed' : isInProg ? 'In progress' : 'Pending'}
                  </span>
                  {!isDone && (
                    <span className="material-symbols-outlined text-[18px] text-secondary">
                      chevron_right
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
