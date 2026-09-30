// src/shared/components/ui/CompletionMark.tsx - 64px animated emerald checkmark

import React, { useEffect, useState } from 'react';

export interface CompletionMarkProps {
  className?: string;
}

export const CompletionMark: React.FC<CompletionMarkProps> = ({ className = '' }) => {
  const [isDrawn, setIsDrawn] = useState(false);

  useEffect(() => {
    try {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate([10, 40, 10]);
      }
    } catch {
      // Ignore vibration errors
    }

    const timer = setTimeout(() => {
      setIsDrawn(true);
    }, 40);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center shadow-sm"
        style={{ backgroundColor: 'var(--success)' }}
        aria-hidden="true"
      >
        <svg
          className="w-8 h-8 text-white"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path
            d="M5 13l4.5 4.5L19 7"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: isDrawn ? 0 : 24,
              transition: 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          />
        </svg>
      </div>
    </div>
  );
};
