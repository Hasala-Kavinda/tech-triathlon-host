import React from 'react';

export interface EndShiftSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmEndShift: () => void;
  unsyncedCount?: number;
}

/**
 * Bottom sheet (16px top radius, handle) confirming shift end:
 * - Title: "End your shift?"
 * - Secondary line: "You can sign in again any time."
 * - If unsynced: "X outlets are not synced yet. Stay online until they finish."
 * - Primary button "End shift" + text button "Cancel"
 */
export const EndShiftSheet: React.FC<EndShiftSheetProps> = ({
  isOpen,
  onClose,
  onConfirmEndShift,
  unsyncedCount = 0
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="end-shift-title"
      className="fixed inset-0 z-50 flex flex-col justify-end select-none"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity duration-200"
        aria-hidden="true"
      />

      {/* Sheet Container */}
      <div
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
        }}
        className="relative w-full max-w-[390px] mx-auto bg-surface rounded-t-[16px] border-t border-hairline p-5 pt-3 flex flex-col gap-3 shadow-2xl z-10 animate-in slide-in-from-bottom duration-200"
      >
        {/* Handle */}
        <div className="w-9 h-1 rounded-full bg-hairline mx-auto shrink-0 mb-1" />

        {/* Content */}
        <div className="text-center space-y-1">
          <h2
            id="end-shift-title"
            className="text-[20px] font-bold text-black dark:text-white tracking-tight"
          >
            End your shift?
          </h2>
          <p className="text-[14px] text-secondary font-normal">
            You can sign in again any time.
          </p>
          {unsyncedCount > 0 && (
            <p className="text-[13px] text-secondary font-normal pt-1">
              {unsyncedCount} {unsyncedCount === 1 ? 'outlet is' : 'outlets are'} not synced yet. Stay online until they finish.
            </p>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-2 mt-2">
          {/* Primary Action Button */}
          <button
            type="button"
            onClick={onConfirmEndShift}
            className="w-full h-12 rounded-xl bg-action text-white text-[16px] font-semibold flex items-center justify-center transition-all active:scale-[0.98] shadow-sm focus:outline-none cursor-pointer"
          >
            End shift
          </button>

          {/* Cancel Text Button */}
          <button
            type="button"
            onClick={onClose}
            className="w-full h-11 text-secondary text-[15px] font-medium flex items-center justify-center hover:opacity-80 transition-opacity focus:outline-none cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
