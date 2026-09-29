import React from 'react';

export interface RecenterButtonProps {
  onRecenter: () => void;
  className?: string;
}

/**
 * Recenter button, top right, 12px from edges:
 * 44px round, surface fill, 0.5px hairline, single "fit route" glyph (four corner brackets) in primary text.
 * The ONLY map control on screen.
 */
export const RecenterButton: React.FC<RecenterButtonProps> = ({
  onRecenter,
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onRecenter();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      aria-label="Fit route to screen"
      className={`w-11 h-11 rounded-full bg-surface border border-hairline flex items-center justify-center text-black dark:text-white shadow-sm active:scale-95 transition-transform z-[1000] focus:outline-none pointer-events-auto cursor-pointer ${className}`}
    >
      {/* Four corner brackets / fit-screen icon */}
      <svg
        className="w-5 h-5 text-current"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 9V5a1 1 0 0 1 1-1h4" />
        <path d="M20 9V5a1 1 0 0 0-1-1h-4" />
        <path d="M4 15v4a1 1 0 0 0 1 1h4" />
        <path d="M20 15v4a1 1 0 0 1-1 1h-4" />
      </svg>
    </button>
  );
};
