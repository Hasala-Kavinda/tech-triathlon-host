import React, { useEffect, useState } from 'react';

export interface SuccessMarkProps {
  isOffline?: boolean;
  city?: string;
  className?: string;
}

export const SuccessMark: React.FC<SuccessMarkProps> = ({
  isOffline = false,
  city = 'Kandy',
  className = ''
}) => {
  const [formattedTime, setFormattedTime] = useState('');

  useEffect(() => {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    setFormattedTime(`${hours}:${minutes}`);

    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate([10, 40, 10]);
      } catch {
        // ignore
      }
    }
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex flex-col items-center justify-center text-center select-none py-6 animate-fade-in ${className}`}
    >
      <style>{`
        @keyframes drawCheck {
          0% {
            stroke-dashoffset: 36;
          }
          100% {
            stroke-dashoffset: 0;
          }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.92); }
          to { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: no-preference) {
          .animate-draw-check {
            stroke-dasharray: 36;
            stroke-dashoffset: 36;
            animation: drawCheck 400ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
          }
          .animate-fade-in {
            animation: fadeIn 300ms ease-out forwards;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-draw-check {
            stroke-dashoffset: 0;
          }
          .animate-fade-in {
            opacity: 1;
          }
        }
      `}</style>

      {/* Circle Icon */}
      {isOffline ? (
        <div
          className="w-20 h-20 rounded-full bg-attention flex items-center justify-center shadow-md mb-5"
          aria-hidden="true"
        >
          {/* Sunburst circle with navy check */}
          <svg
            className="w-10 h-10 text-[#0B1437] stroke-[3.5] animate-draw-check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      ) : (
        <div
          className="w-20 h-20 rounded-full bg-success flex items-center justify-center shadow-md mb-5"
          aria-hidden="true"
        >
          {/* Emerald circle that draws a white check (400ms) */}
          <svg
            className="w-10 h-10 text-white stroke-[3.5] animate-draw-check"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Title */}
      <h2 className="text-[22px] font-semibold text-black dark:text-white leading-tight">
        {isOffline ? 'Saved on this phone' : 'Delivery confirmed'}
      </h2>

      {/* City + Time or Offline notice */}
      <p className="text-[15px] text-secondary mt-1.5 leading-tight">
        {isOffline ? (
          'Will be confirmed when you are online'
        ) : (
          <>
            {city} · <span className="font-mono tabular-nums">{formattedTime || '06:52'}</span>
          </>
        )}
      </p>

      {/* Returning to route caption */}
      <p className="text-[13px] text-secondary/80 mt-4 leading-tight">
        Returning to route
      </p>
    </div>
  );
};
