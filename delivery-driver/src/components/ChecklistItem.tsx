import React from 'react';
import { OutletProduct } from '../state/routeContext';

export interface ChecklistItemProps {
  product: OutletProduct;
  onToggle: (productId: string) => void;
}

export const ChecklistItem: React.FC<ChecklistItemProps> = ({ product, onToggle }) => {
  const { id, name, quantity, unit, chilled, checked } = product;

  const handleClick = () => {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(10);
      } catch {
        // ignore if blocked by browser policy
      }
    }
    onToggle(id);
  };

  return (
    <div
      role="checkbox"
      aria-checked={checked}
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          handleClick();
        }
      }}
      className="w-full min-h-[56px] px-4 py-3 flex items-center justify-between cursor-pointer select-none transition-colors active:bg-black/[0.03] dark:active:bg-white/[0.03] focus:outline-none"
    >
      {/* Left: 26px circular checkbox + Product name / chilled subline */}
      <div className="flex items-center gap-3.5 flex-1 min-w-0 pr-3">
        {/* Apple Reminders style 26px circular checkbox */}
        <div
          className={`w-[26px] h-[26px] rounded-full shrink-0 flex items-center justify-center transition-all duration-200 active:scale-90 ${
            checked
              ? 'bg-action border border-action'
              : 'border-[1.5px] border-hairline bg-transparent hover:border-secondary/60'
          }`}
        >
          {checked && (
            <svg
              className="w-3.5 h-3.5 text-white stroke-[2.5]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </div>

        {/* Product title & optional Chilled note */}
        <div className="flex flex-col min-w-0">
          <span
            className={`text-[17px] font-medium leading-tight truncate transition-colors duration-150 ${
              checked ? 'text-secondary' : 'text-black dark:text-white'
            }`}
          >
            {name}
          </span>
          {chilled && (
            <span className="text-[13px] text-secondary leading-tight mt-0.5">
              Chilled
            </span>
          )}
        </div>
      </div>

      {/* Right: Quantity and unit in data font */}
      <div className="shrink-0 text-right font-mono tabular-nums text-[15px] text-secondary">
        {quantity} {unit}
      </div>
    </div>
  );
};
