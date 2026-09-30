// src/features/pin-confirmation/components/CustomKeypad.tsx - Custom 10-digit PIN keypad

import React from 'react';

export interface CustomKeypadProps {
  isDisabled: boolean;
  onDigitPress: (digit: string) => void;
  onDelete: () => void;
}

export const CustomKeypad: React.FC<CustomKeypadProps> = ({
  isDisabled,
  onDigitPress,
  onDelete
}) => {
  return (
    <footer className="w-full pb-2 select-none">
      <div
        className={`grid grid-cols-3 gap-2.5 w-full max-w-[320px] min-w-0 mx-auto transition-opacity ${
          isDisabled ? 'opacity-40 pointer-events-none' : 'opacity-100'
        }`}
      >
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            type="button"
            onClick={() => onDigitPress(digit)}
            className="h-14 rounded-2xl bg-surface border border-hairline shadow-sm text-[24px] font-semibold text-black dark:text-white font-mono tabular-nums flex items-center justify-center active:scale-95 active:bg-hairline/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
          >
            {digit}
          </button>
        ))}
        <div />
        <button
          type="button"
          onClick={() => onDigitPress('0')}
          className="h-14 rounded-2xl bg-surface border border-hairline shadow-sm text-[24px] font-semibold text-black dark:text-white font-mono tabular-nums flex items-center justify-center active:scale-95 active:bg-hairline/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          0
        </button>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Delete digit"
          className="h-14 rounded-2xl bg-surface border border-hairline shadow-sm text-[20px] text-secondary flex items-center justify-center active:scale-95 active:bg-hairline/40 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action"
        >
          <span className="material-symbols-outlined text-[24px]">backspace</span>
        </button>
      </div>
    </footer>
  );
};
