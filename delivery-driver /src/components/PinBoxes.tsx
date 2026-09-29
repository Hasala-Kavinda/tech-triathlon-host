import React from 'react';
import { PIN_LENGTH } from '../services/pinService';

export interface PinBoxesProps {
  pin: string;
  isWrong?: boolean;
  isVerifying?: boolean;
  isLocked?: boolean;
  className?: string;
}

export const PinBoxes: React.FC<PinBoxesProps> = ({
  pin,
  isWrong = false,
  isVerifying = false,
  isLocked = false,
  className = ''
}) => {
  const digits = pin.split('');
  const activeIndex = pin.length < PIN_LENGTH ? pin.length : -1;

  return (
    <div
      role="group"
      aria-label="4-digit confirmation PIN"
      className={`flex items-center justify-center gap-3 select-none ${
        isWrong ? 'animate-pin-shake' : ''
      } ${isLocked ? 'opacity-40 pointer-events-none' : ''} ${className}`}
    >
      <style>{`
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-8px); }
          40%, 80% { transform: translateX(8px); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .animate-pin-shake {
            animation: pinShake 300ms ease-in-out;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-pin-shake {
            opacity: 0.7;
            transition: opacity 150ms ease;
          }
        }
      `}</style>

      {Array.from({ length: PIN_LENGTH }).map((_, index) => {
        const digit = digits[index] || '';
        const isFilled = digit !== '';
        const isCurrent = index === activeIndex && !isVerifying && !isLocked && !isWrong;

        let boxClasses =
          'w-[60px] h-[68px] rounded-[12px] bg-surface flex items-center justify-center transition-all duration-150 relative';

        if (isWrong) {
          boxClasses += ' border border-critical text-critical';
        } else if (isCurrent) {
          boxClasses += ' border-transparent ring-2 ring-action text-black dark:text-white';
        } else {
          boxClasses += ' border border-hairline text-black dark:text-white';
        }

        return (
          <div
            key={index}
            aria-label={`Digit ${index + 1}`}
            className={boxClasses}
          >
            <span className="font-mono tabular-nums text-[32px] font-semibold leading-none select-none">
              {digit}
            </span>
          </div>
        );
      })}
    </div>
  );
};
