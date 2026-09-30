// src/shared/components/ui/Toast.tsx - In-app notification toast (36px Apple-style)

import React from 'react';

export interface ToastProps {
  message: string | null;
}

export const Toast: React.FC<ToastProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
    >
      <div className="h-9 px-4 rounded-full bg-neutral-900/90 text-white text-[13px] font-medium flex items-center justify-center shadow-lg backdrop-blur-md border border-neutral-700/50 animate-in fade-in slide-in-from-bottom-2 duration-200">
        {message}
      </div>
    </div>
  );
};
