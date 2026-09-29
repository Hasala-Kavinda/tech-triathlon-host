import React from 'react';
import { StopStatus } from '../state/routeContext';

interface StatusChipProps {
  status: StopStatus;
  className?: string;
}

export const StatusChip: React.FC<StatusChipProps> = ({ status, className = '' }) => {
  switch (status) {
    case 'completed':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm font-semibold bg-surface-container-highest text-status-completed border border-status-completed/30 ${className}`}
        >
          <span
            className="material-symbols-outlined text-[14px] mr-1"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            check_circle
          </span>
          COMPLETED
        </span>
      );

    case 'in_progress':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm font-semibold bg-primary-fixed text-primary border border-primary/20 ${className}`}
        >
          <span
            className="material-symbols-outlined text-[14px] mr-1 animate-spin text-status-in-progress"
          >
            autorenew
          </span>
          IN PROGRESS
        </span>
      );

    case 'attention':
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm font-semibold bg-error-container text-error border border-error/20 ${className}`}
        >
          <span className="material-symbols-outlined text-[13px] mr-1">warning</span>
          ATTENTION
        </span>
      );

    case 'pending':
    default:
      return (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-label-sm font-label-sm font-medium bg-surface-container text-secondary border border-outline-variant ${className}`}
        >
          PENDING
        </span>
      );
  }
};
