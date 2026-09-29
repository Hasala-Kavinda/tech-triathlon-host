import React from 'react';
import { Outlet } from '../state/routeContext';

export interface OutletListCardProps {
  outlets: Outlet[];
  onOpenOutlet: (outlet: Outlet, index: number) => void;
}

export const OutletListCard: React.FC<OutletListCardProps> = ({ outlets, onOpenOutlet }) => {
  return (
    <section
      aria-label="All outlets in route"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full bg-surface rounded-[20px] border border-hairline shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none overflow-hidden"
    >
      {/* Header Row: "Outlets" (17px semibold) and count "14" (secondary, tabular numerals) */}
      <div className="px-4 py-3.5 flex items-center justify-between border-b-[0.5px] border-hairline">
        <h3 className="text-[17px] font-semibold text-black dark:text-white tracking-tight leading-none">
          Outlets
        </h3>
        <span className="text-[15px] text-secondary font-mono tabular-nums font-normal">
          {outlets.length}
        </span>
      </div>

      {/* List of Outlets in visit order */}
      <div className="divide-y-[0.5px] divide-hairline">
        {outlets.map((outlet, index) => {
          const isFirst = index === 0;
          const isLast = index === outlets.length - 1;
          const isCompleted = outlet.status === 'completed';
          const isInProgress = outlet.status === 'in_progress';
          const isPending = outlet.status === 'pending';

          const statusDotColor = isCompleted
            ? 'bg-success'
            : isInProgress
            ? 'bg-action'
            : 'bg-secondary/40';

          const statusLabel = isCompleted
            ? 'Completed'
            : isInProgress
            ? 'In progress'
            : 'Pending';

          return (
            <div
              key={outlet.id || index}
              className={`relative flex items-stretch min-h-[56px] transition-opacity ${
                isCompleted ? 'opacity-60 cursor-default' : 'hover:bg-bg/40 active:bg-bg/80'
              }`}
            >
              {/* Left Column: Numbered Circle (24px) & Connecting Vertical Sequence Line */}
              <div className="w-14 relative flex items-center justify-center shrink-0">
                {/* Upper line segment */}
                {!isFirst && (
                  <div className="absolute top-0 bottom-1/2 left-1/2 -translate-x-1/2 w-[1px] bg-hairline pointer-events-none" />
                )}
                {/* Lower line segment */}
                {!isLast && (
                  <div className="absolute top-1/2 bottom-0 left-1/2 -translate-x-1/2 w-[1px] bg-hairline pointer-events-none" />
                )}

                {/* 24px Sequence Number Circle */}
                <div
                  className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-mono tabular-nums border transition-colors ${
                    isCompleted
                      ? 'bg-success/10 border-success/30 text-success'
                      : isInProgress
                      ? 'bg-action/10 border-action/40 text-action font-semibold'
                      : 'bg-bg border-hairline text-secondary'
                  }`}
                >
                  {index + 1}
                </div>
              </div>

              {/* Middle & Right Content: Tappable if pending or in_progress */}
              {isCompleted ? (
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
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColor}`} />
                    <span className="text-[13px] text-secondary font-normal">{statusLabel}</span>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onOpenOutlet(outlet, index)}
                  className="flex-1 py-2.5 pr-4 flex items-center justify-between min-w-0 text-left focus:outline-none cursor-pointer"
                >
                  <div className="min-w-0 pr-2">
                    <p className="text-[17px] font-medium text-black dark:text-white leading-tight truncate">
                      {outlet.city}
                    </p>
                    <p className="text-[13px] text-secondary font-normal mt-0.5 tabular-nums">
                      {outlet.itemCount} items
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${statusDotColor}`} />
                    <span className="text-[13px] text-secondary font-normal">{statusLabel}</span>
                    <span className="material-symbols-outlined text-[18px] text-secondary opacity-60">
                      chevron_right
                    </span>
                  </div>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
