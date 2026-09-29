import React from 'react';

export interface TopBarProps {
  isScrolled?: boolean;
  onBack?: () => void;
  showBackButton?: boolean;
  title?: string;
}

export const TopBar: React.FC<TopBarProps> = ({
  isScrolled = false,
  onBack,
  showBackButton = false,
  title = 'Fleet Logistics'
}) => {
  return (
    <header
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className={`w-full h-11 shrink-0 flex items-center justify-between px-4 bg-bg transition-all duration-150 z-20 relative ${
        isScrolled
          ? 'border-b-[0.5px] border-hairline'
          : 'border-b-[0.5px] border-transparent'
      }`}
    >
      {/* Left Back Button Slot: min 44x44 tap target */}
      <div className="w-11 h-11 flex items-center justify-start -ml-2">
        {showBackButton && onBack ? (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to route selection"
            className="w-11 h-11 flex items-center justify-center text-black dark:text-white hover:opacity-70 active:scale-95 transition-all focus:outline-none"
          >
            <span className="material-symbols-outlined text-[24px]">chevron_left</span>
          </button>
        ) : null}
      </div>

      {/* Centered Title (17px semibold, primary text) */}
      <h1 className="absolute left-1/2 -translate-x-1/2 text-[17px] font-semibold text-black dark:text-white tracking-tight pointer-events-none">
        {title}
      </h1>

      {/* Right Spacer Slot for balance */}
      <div className="w-11 h-11" aria-hidden="true" />
    </header>
  );
};
