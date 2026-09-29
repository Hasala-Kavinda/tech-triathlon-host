// app/src/components/shared/TopBar.tsx - 44px TopBar matching design tokens

import React from 'react';

export interface TopBarProps {
  title?: string;
  showBackButton?: boolean;
  onBack?: () => void;
  isScrolled?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  title = 'Fleet Logistics',
  showBackButton = false,
  onBack,
  isScrolled = false
}) => {
  return (
    <header
      className={`w-full shrink-0 flex items-center justify-between px-3 bg-bg transition-colors duration-150 z-30 select-none ${
        isScrolled ? 'border-b-[0.5px] border-hairline' : 'border-b-[0.5px] border-transparent'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        height: 'calc(44px + env(safe-area-inset-top, 0px))'
      }}
    >
      <div className="min-w-[72px] shrink-0 flex items-center">
        {showBackButton && onBack ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onBack();
            }}
            aria-label="Back"
            className="inline-flex items-center gap-0.5 text-black dark:text-white hover:opacity-70 active:scale-95 transition-all focus:outline-none py-1 -ml-1 cursor-pointer select-none"
          >
            <span className="material-symbols-outlined text-[24px] leading-none">chevron_left</span>
            <span className="text-[17px] font-normal leading-none -ml-0.5">Back</span>
          </button>
        ) : (
          <div className="w-6" />
        )}
      </div>

      <h1 className="text-[17px] font-semibold text-black dark:text-white tracking-tight text-center truncate flex-1 pointer-events-none">
        {title}
      </h1>

      <div className="min-w-[72px] shrink-0" />
    </header>
  );
};
