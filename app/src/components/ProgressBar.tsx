import React from 'react';

export interface ProgressBarProps {
  unpackedCount: number;
  totalCount: number;
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  unpackedCount,
  totalCount,
  className = ''
}) => {
  const percentage =
    totalCount > 0 ? Math.min(100, Math.max(0, (unpackedCount / totalCount) * 100)) : 0;

  return (
    <div className={`w-full select-none ${className}`}>
      {/* Slim 4px tall rounded bar: hairline track, accent fill */}
      <div
        className="w-full h-1 bg-hairline/60 rounded-full overflow-hidden"
        role="progressbar"
        aria-valuenow={unpackedCount}
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-label="Unpacking progress"
      >
        <div
          className="h-full bg-action rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Caption in secondary text: numbers in data font */}
      <p className="text-[13px] text-secondary mt-1.5 leading-tight">
        <span className="font-mono tabular-nums">{unpackedCount}</span> of{' '}
        <span className="font-mono tabular-nums">{totalCount}</span> unpacked
      </p>
    </div>
  );
};
