// src/shared/components/ui/RoutePill.tsx - Route status pill overlay

import React from 'react';

export interface RoutePillProps {
  routeNumber: number;
  distanceKm: number;
  className?: string;
}

export const RoutePill: React.FC<RoutePillProps> = ({
  routeNumber,
  distanceKm,
  className = ''
}) => {
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      className={`h-8 px-3.5 rounded-full bg-surface border border-hairline flex items-center gap-1.5 shadow-sm select-none z-[1000] pointer-events-auto ${className}`}
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
    >
      <span className="text-[14px] font-medium text-black dark:text-white leading-none">
        Route <span className="font-mono tabular-nums font-semibold">{routeNumber}</span>
      </span>
      <span className="text-[14px] text-secondary leading-none">·</span>
      <span className="text-[14px] font-mono tabular-nums font-medium text-secondary leading-none">
        {distanceKm} km
      </span>
    </div>
  );
};
