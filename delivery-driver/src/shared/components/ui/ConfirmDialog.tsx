// src/shared/components/ui/ConfirmDialog.tsx - A modal that must be answered before an action runs

import React from 'react';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  isBusy = false,
  onConfirm,
  onCancel
}) => {
  if (!isOpen) return null;
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/45 px-6"
      role="presentation"
      onClick={isBusy ? undefined : onCancel}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
        className="w-full max-w-[340px] rounded-[20px] bg-surface border border-hairline p-5 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-dialog-title" className="text-[20px] font-semibold text-black dark:text-white leading-tight">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="text-[15px] text-secondary mt-2 leading-snug">
          {message}
        </p>
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="w-full h-12 rounded-xl bg-action text-white text-[16px] font-semibold cursor-pointer active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {isBusy ? 'Please wait…' : confirmLabel}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="w-full h-11 rounded-xl text-secondary text-[15px] font-medium cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
