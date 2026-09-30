// src/features/pin-confirmation/components/PinBoxes.tsx - 4 PIN boxes with shake animation

import React from 'react';

export interface PinBoxesProps {
  pin: string;
  isWrong: boolean;
}

export const PinBoxes: React.FC<PinBoxesProps> = ({ pin, isWrong }) => {
  return (
    <div
      className={`flex items-center justify-center gap-3.5 my-2 ${
        isWrong ? 'animate-pin-shake' : ''
      }`}
    >
      {[0, 1, 2, 3].map((idx) => {
        const isEntered = pin.length > idx;
        const digit = isEntered ? pin[idx] : '';
        const isCurrent = pin.length === idx;

        return (
          <div
            key={idx}
            className={`w-[52px] h-[64px] rounded-2xl border-2 flex items-center justify-center bg-surface transition-all duration-150 select-none ${
              isWrong
                ? 'border-critical bg-critical/5'
                : isCurrent
                ? 'border-action shadow-sm ring-4 ring-action/10'
                : isEntered
                ? 'border-black/20 dark:border-white/20'
                : 'border-hairline'
            }`}
          >
            <span
              className={`text-[28px] font-mono tabular-nums font-bold text-black dark:text-white transition-all transform ${
                isEntered ? 'scale-100 opacity-100' : 'scale-75 opacity-0'
              }`}
            >
              {digit}
            </span>
          </div>
        );
      })}
    </div>
  );
};
