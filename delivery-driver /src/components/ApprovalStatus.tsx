import React from 'react';

export interface ApprovalStatusProps {
  status?: 'waiting' | 'approved' | 'rejected';
  className?: string;
}

export const ApprovalStatus: React.FC<ApprovalStatusProps> = ({ status, className = '' }) => {
  if (!status || status === 'rejected') {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex items-center gap-2 text-[14px] leading-tight select-none ${className}`}
    >
      {status === 'waiting' && (
        <>
          <span className="w-2 h-2 rounded-full bg-pending animate-pulse shrink-0" aria-hidden="true" />
          <span className="text-secondary font-normal">Waiting for the store manager</span>
        </>
      )}

      {status === 'approved' && (
        <>
          <span className="w-2 h-2 rounded-full bg-success shrink-0" aria-hidden="true" />
          <span className="text-secondary font-normal">Approved. Ask for the PIN.</span>
        </>
      )}
    </div>
  );
};
