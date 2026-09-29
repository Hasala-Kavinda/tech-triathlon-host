import React from 'react';

export interface KeypadProps {
  hasDigits: boolean;
  disabled?: boolean;
  isLocked?: boolean;
  onPressDigit: (digit: string) => void;
  onDelete: () => void;
  className?: string;
}

export const Keypad: React.FC<KeypadProps> = ({
  hasDigits,
  disabled = false,
  isLocked = false,
  onPressDigit,
  onDelete,
  className = ''
}) => {
  const handleVibrate = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore if blocked by browser policy
      }
    }
  };

  const handleDigitClick = (digit: string) => {
    if (disabled || isLocked) return;
    handleVibrate();
    onPressDigit(digit);
  };

  const handleDeleteClick = () => {
    if (disabled || isLocked || !hasDigits) return;
    handleVibrate();
    onDelete();
  };

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9']
  ];

  return (
    <div
      role="group"
      aria-label="PIN numeric keypad"
      className={`w-full max-w-[320px] mx-auto flex flex-col items-center gap-4 px-4 select-none transition-opacity duration-150 ${
        isLocked
          ? 'opacity-40 pointer-events-none'
          : disabled
          ? 'opacity-60 pointer-events-none'
          : 'opacity-100'
      } ${className}`}
    >
      {/* Rows 1-3 */}
      {rows.map((row, rIdx) => (
        <div key={rIdx} className="w-full flex items-center justify-between">
          {row.map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={disabled || isLocked}
              onClick={() => handleDigitClick(digit)}
              aria-label={digit}
              className="w-[72px] h-[72px] rounded-full bg-surface text-black dark:text-white text-[28px] font-normal flex items-center justify-center border-0 shadow-none outline-none cursor-pointer select-none active:scale-[0.96] active:bg-surface-raised transition-all duration-100 focus:outline-none"
            >
              {digit}
            </button>
          ))}
        </div>
      ))}

      {/* Row 4: Empty space, 0, Backspace */}
      <div className="w-full flex items-center justify-between">
        {/* Left empty slot for balance */}
        <div className="w-[72px] h-[72px]" aria-hidden="true" />

        {/* 0 Key */}
        <button
          type="button"
          disabled={disabled || isLocked}
          onClick={() => handleDigitClick('0')}
          aria-label="0"
          className="w-[72px] h-[72px] rounded-full bg-surface text-black dark:text-white text-[28px] font-normal flex items-center justify-center border-0 shadow-none outline-none cursor-pointer select-none active:scale-[0.96] active:bg-surface-raised transition-all duration-100 focus:outline-none"
        >
          0
        </button>

        {/* Backspace Key: shown only when at least one digit is entered */}
        <div className="w-[72px] h-[72px] flex items-center justify-center">
          {hasDigits && (
            <button
              type="button"
              disabled={disabled || isLocked}
              onClick={handleDeleteClick}
              aria-label="Delete last digit"
              className="w-[72px] h-[72px] rounded-full bg-surface text-black dark:text-white flex items-center justify-center border-0 shadow-none outline-none cursor-pointer select-none active:scale-[0.96] active:bg-surface-raised transition-all duration-100 focus:outline-none"
            >
              <svg
                className="w-7 h-7 stroke-[1.8]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
                <line x1="18" y1="9" x2="12" y2="15" />
                <line x1="12" y1="9" x2="18" y2="15" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
