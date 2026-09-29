import React, { useEffect } from 'react';

interface PinInputProps {
  pin: string;
  maxDigits?: number;
  hasError?: boolean;
  errorMessage?: string;
  onDigitPress: (digit: string) => void;
  onClear: () => void;
  onBackspace: () => void;
}

export const PinInput: React.FC<PinInputProps> = ({
  pin,
  maxDigits = 4,
  hasError = false,
  errorMessage,
  onDigitPress,
  onClear,
  onBackspace
}) => {
  // Physical keyboard listener for desktop / test environments
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        onDigitPress(e.key);
      } else if (e.key === 'Backspace') {
        onBackspace();
      } else if (e.key === 'Escape' || e.key === 'Delete') {
        onClear();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onDigitPress, onBackspace, onClear]);

  const digits = Array.from({ length: maxDigits }, (_, index) => {
    const digit = pin[index];
    const isFilled = digit !== undefined;
    const isActive = index === pin.length && !hasError;

    return { index, digit, isFilled, isActive };
  });

  return (
    <div className="w-full flex flex-col items-center select-none">
      {/* 4-Digit Display Boxes */}
      <div
        className={`flex justify-center items-center gap-3 py-2 ${
          hasError ? 'animate-shake' : ''
        }`}
      >
        {digits.map(({ index, digit, isFilled, isActive }) => {
          if (hasError) {
            return (
              <div
                key={index}
                className="w-14 h-16 rounded-xl bg-critical/10 border-2 border-critical flex items-center justify-center shadow-none text-headline-lg font-headline-lg text-critical"
              >
                {digit || '-'}
              </div>
            );
          }

          if (isFilled) {
            return (
              <div
                key={index}
                className="w-14 h-16 rounded-xl bg-surface border border-hairline flex items-center justify-center shadow-none transition-colors"
              >
                <span className="text-headline-lg font-headline-lg text-primary">
                  {digit}
                </span>
              </div>
            );
          }

          if (isActive) {
            return (
              <div
                key={index}
                className="w-14 h-16 rounded-xl bg-surface border border-hairline ring-2 ring-action flex items-center justify-center shadow-sm relative"
              >
                <span className="w-0.5 h-7 bg-action animate-blink"></span>
              </div>
            );
          }

          return (
            <div
              key={index}
              className="w-14 h-16 rounded-xl bg-surface border border-hairline flex items-center justify-center shadow-none"
            >
              <span className="w-2 h-2 rounded-full bg-hairline"></span>
            </div>
          );
        })}
      </div>

      {/* Error or Hint feedback */}
      <div className="min-h-[24px] flex items-center justify-center text-center mt-1">
        {hasError ? (
          <p className="text-body-sm font-label-sm text-critical flex items-center gap-1 font-semibold">
            <span className="material-symbols-outlined text-[16px]">error</span>
            {errorMessage || 'Incorrect PIN. Please re-enter.'}
          </p>
        ) : (
          <p className="text-body-sm font-body-sm text-secondary flex items-center gap-1">
            <span className="material-symbols-outlined text-secondary text-sm">info</span>
            If incorrect, store manager can re-enter or sign fallback
          </p>
        )}
      </div>

      {/* Touch-Optimized Numeric Keypad (48px+ min tap target) */}
      <div className="grid grid-cols-3 gap-2 w-full max-w-[358px] mx-auto mt-4">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onDigitPress(num)}
            className="h-14 min-h-[56px] rounded-xl bg-surface-container-lowest border border-outline-variant text-headline-md font-headline-md text-on-surface flex items-center justify-center active:bg-surface-container hover:bg-surface-container-low transition-colors shadow-sm active:scale-95"
          >
            {num}
          </button>
        ))}

        {/* Row 4: Controls */}
        <button
          type="button"
          onClick={onClear}
          className="h-14 min-h-[56px] rounded-xl bg-surface-container border border-outline-variant text-label-lg font-label-lg text-secondary flex items-center justify-center active:bg-surface-container-high transition-colors tracking-wide font-semibold active:scale-95"
        >
          Clear
        </button>

        <button
          type="button"
          onClick={() => onDigitPress('0')}
          className="h-14 min-h-[56px] rounded-xl bg-surface-container-lowest border border-outline-variant text-headline-md font-headline-md text-on-surface flex items-center justify-center active:bg-surface-container hover:bg-surface-container-low transition-colors shadow-sm active:scale-95"
        >
          0
        </button>

        <button
          aria-label="Backspace"
          type="button"
          onClick={onBackspace}
          className="h-14 min-h-[56px] rounded-xl bg-surface-container border border-outline-variant text-on-surface-variant flex items-center justify-center active:bg-surface-container-high transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[24px]">backspace</span>
        </button>
      </div>
    </div>
  );
};
