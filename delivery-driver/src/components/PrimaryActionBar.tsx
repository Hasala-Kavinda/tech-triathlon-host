import React, { useEffect, useState } from 'react';

export interface PrimaryActionBarProps {
  unpackedCount: number;
  totalCount: number;
  isScrolled?: boolean;
  onProceed: () => void;
}

export const PrimaryActionBar: React.FC<PrimaryActionBarProps> = ({
  unpackedCount,
  totalCount,
  isScrolled = false,
  onProceed
}) => {
  const isComplete = totalCount > 0 && unpackedCount >= totalCount;
  const remainingCount = Math.max(0, totalCount - unpackedCount);
  const [justCompleted, setJustCompleted] = useState(false);

  useEffect(() => {
    if (isComplete) {
      setJustCompleted(true);
      const timer = setTimeout(() => setJustCompleted(false), 800);
      return () => clearTimeout(timer);
    } else {
      setJustCompleted(false);
    }
  }, [isComplete]);

  return (
    <footer
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif',
        paddingBottom: 'max(28px, calc(16px + env(safe-area-inset-bottom, 0px)))'
      }}
      className={`w-full bg-bg shrink-0 px-4 pt-3 transition-colors duration-150 select-none z-30 ${
        isScrolled ? 'border-t-[0.5px] border-hairline' : 'border-t-[0.5px] border-transparent'
      }`}
    >
      <div className="w-full max-w-[500px] mx-auto">
        {isComplete ? (
          <div className="w-full flex flex-col items-center">
            {/* Enabled button: solid accent fill, white text, 56px tall, 8px radius, 200ms fade + ring pulse */}
            <button
              type="button"
              onClick={onProceed}
              aria-label="Unpacking complete, proceed to PIN confirmation"
              className={`w-full h-[56px] rounded-[8px] bg-action text-white flex items-center justify-center font-semibold text-[17px] cursor-pointer active:scale-[0.99] transition-all duration-200 ${
                justCompleted ? 'animate-pulse ring-4 ring-action/30' : ''
              }`}
            >
              Unpacking complete
            </button>

            {/* Quiet caption in secondary text */}
            <p className="text-[13px] text-secondary text-center mt-2.5 leading-tight">
              Next: ask the store manager for the PIN
            </p>
          </div>
        ) : (
          <div className="w-full">
            {/* Disabled button: hairline outline at 40% opacity, secondary text */}
            <button
              type="button"
              disabled
              aria-disabled="true"
              className="w-full h-[56px] rounded-[8px] border border-hairline/40 bg-transparent text-secondary flex items-center justify-center font-normal text-[17px] cursor-not-allowed"
            >
              {remainingCount} item{remainingCount === 1 ? '' : 's'} left to unpack
            </button>
          </div>
        )}
      </div>
    </footer>
  );
};
