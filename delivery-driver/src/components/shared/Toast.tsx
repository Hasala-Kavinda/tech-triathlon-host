// app/src/components/shared/Toast.tsx - 36px pill toast for external action feedback

import React from 'react';

interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 h-[36px] px-4 rounded-full bg-surface border border-hairline shadow-lg flex items-center justify-center text-[14px] font-medium text-black dark:text-white pointer-events-none toast-enter select-none"
    >
      {message}
    </div>
  );
};
