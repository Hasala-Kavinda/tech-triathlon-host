import React from 'react';

export interface OnlineSwitchProps {
  isOnline: boolean;
  onToggle: () => void;
  className?: string;
}

/**
 * Apple-inspired minimal capsule switch for driver online/offline duty status.
 * Fits naturally into top bars or headers without cluttering the screen.
 */
export const OnlineSwitch: React.FC<OnlineSwitchProps> = ({
  isOnline,
  onToggle,
  className = ''
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isOnline ? 'Switch to offline' : 'Switch to online'}
      aria-pressed={isOnline}
      className={`inline-flex items-center gap-1.5 h-[32px] px-3 rounded-full transition-all duration-200 active:scale-95 select-none focus:outline-none ${className}`}
      style={{
        backgroundColor: isOnline ? 'var(--gps-tint)' : 'var(--surface)',
        border: `0.5px solid ${isOnline ? 'var(--success)' : 'var(--hairline)'}`
      }}
    >
      <span
        className="w-2 h-2 rounded-full shrink-0 transition-colors duration-200"
        style={{
          backgroundColor: isOnline ? 'var(--success)' : 'var(--pending)'
        }}
      />
      <span
        className="text-[13px] font-medium tracking-tight transition-colors duration-200 leading-none"
        style={{
          color: isOnline ? 'var(--success-text)' : 'var(--text-secondary)'
        }}
      >
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </button>
  );
};
