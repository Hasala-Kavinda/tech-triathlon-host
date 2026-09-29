import React from 'react';

export interface KeyFiguresProps {
  outletsCount: number;
  itemsCount: number;
  distanceKm: number;
  totalTime: string;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Three quiet key figures in a row without boxes or dividers.
 * Large numbers (28px in data font) over small captions in secondary text.
 * Beneath them, a single secondary line with total time.
 */
export const KeyFigures: React.FC<KeyFiguresProps> = ({
  outletsCount,
  itemsCount,
  distanceKm,
  totalTime,
  className = '',
  style
}) => {
  return (
    <div className={`w-full text-center select-none ${className}`} style={style}>
      <div className="grid grid-cols-3 gap-1 px-1">
        {/* Outlets */}
        <div className="flex flex-col items-center">
          <span
            className="text-[28px] font-bold tracking-tight text-black dark:text-white tabular-nums font-mono leading-none"
          >
            {outletsCount}
          </span>
          <span className="text-[13px] text-secondary mt-1.5 leading-tight font-normal">
            outlets
          </span>
        </div>

        {/* Items unpacked */}
        <div className="flex flex-col items-center">
          <span
            className="text-[28px] font-bold tracking-tight text-black dark:text-white tabular-nums font-mono leading-none"
          >
            {itemsCount}
          </span>
          <span className="text-[13px] text-secondary mt-1.5 leading-tight font-normal">
            items unpacked
          </span>
        </div>

        {/* Distance */}
        <div className="flex flex-col items-center">
          <span
            className="text-[28px] font-bold tracking-tight text-black dark:text-white tabular-nums font-mono leading-none"
          >
            {distanceKm} km
          </span>
          <span className="text-[13px] text-secondary mt-1.5 leading-tight font-normal">
            distance
          </span>
        </div>
      </div>

      {/* Total time secondary line */}
      <p className="text-[14px] text-secondary mt-3 tabular-nums font-normal tracking-tight">
        Total time <span className="font-mono">{totalTime}</span>
      </p>
    </div>
  );
};
