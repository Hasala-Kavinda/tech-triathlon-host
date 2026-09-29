import React, { useState } from 'react';
import { Outlet } from '../state/routeContext';

export interface OutletSummaryListProps {
  outlets: Outlet[];
  initialExpanded?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Inset grouped card with the header "Outlets" (17px semibold).
 * One row per outlet in visit order with hairline dividers (min 48px tall).
 * Shows city (17px), completion time in data font, status dot + text.
 * Shows first 5 rows with an accent button to expand inline (200ms animation).
 */
export const OutletSummaryList: React.FC<OutletSummaryListProps> = ({
  outlets,
  initialExpanded = false,
  className = '',
  style
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const displayedOutlets = isExpanded ? outlets : outlets.slice(0, 5);
  const hasMore = outlets.length > 5;

  return (
    <section
      aria-label="Delivered Outlets Summary"
      className={`w-full bg-surface rounded-[20px] border border-hairline overflow-hidden select-none ${className}`}
      style={style}
    >
      {/* Header */}
      <div className="px-4 pt-3.5 pb-2.5">
        <h2 className="text-[17px] font-semibold text-black dark:text-white tracking-tight">
          Outlets
        </h2>
      </div>

      {/* Outlets rows */}
      <div className="divide-y divide-hairline border-t border-hairline transition-all duration-200">
        {displayedOutlets.map((outlet, index) => {
          const isPendingSync = outlet.syncStatus === 'pending' || outlet.pendingSync === true;
          const completionTime = outlet.completedAt || '06:52';

          return (
            <div
              key={outlet.id || index}
              className="px-4 py-2.5 min-h-[48px] flex items-center justify-between gap-3"
            >
              {/* Left: City + Status */}
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-[17px] font-medium text-black dark:text-white tracking-tight truncate leading-snug">
                  {outlet.city}
                </span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: isPendingSync ? 'var(--attention)' : 'var(--success)'
                    }}
                    aria-hidden="true"
                  />
                  <span className="text-[13px] text-secondary font-normal leading-none">
                    {isPendingSync ? 'Waiting to sync' : 'Delivered'}
                  </span>
                </div>
              </div>

              {/* Right: Completion time in data font */}
              <div className="shrink-0 text-right">
                <span className="font-mono text-[14px] text-secondary tabular-nums leading-none">
                  {completionTime}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expand / Collapse Action button */}
      {hasMore && (
        <div className="border-t border-hairline px-4 py-3 bg-surface text-center">
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[15px] font-medium text-action hover:opacity-80 transition-opacity focus:outline-none cursor-pointer py-1"
          >
            {isExpanded ? 'Show less' : `Show all ${outlets.length} outlets`}
          </button>
        </div>
      )}
    </section>
  );
};
