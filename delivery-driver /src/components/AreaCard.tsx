import React from 'react';
import { Stop } from '../state/routeContext';
import { StatusChip } from './StatusChip';

interface AreaCardProps {
  stop: Stop;
  onOpenChecklist: (stopId: number) => void;
  onNavigate?: (stop: Stop) => void;
}

export const AreaCard: React.FC<AreaCardProps> = ({ stop, onOpenChecklist, onNavigate }) => {
  const { status, stopNumber, name, address, products = [], completedTime, eta, distance, dock, warningNote } = stop;
  const completedProducts = products.filter((p: any) => p.checked).length;
  const totalProducts = products.length;

  if (status === 'completed') {
    return (
      <article
        onClick={() => onOpenChecklist(stop.id)}
        className="bg-surface-container-low border border-outline-variant rounded-xl p-space-md opacity-75 hover:opacity-100 transition-opacity cursor-pointer active:scale-[0.99]"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-status-completed text-on-tertiary text-label-sm font-label-sm font-bold">
              {stopNumber}
            </span>
            <span className="text-label-sm font-label-sm font-medium text-secondary">
              {completedTime || '09:30 AM'} • Delivered
            </span>
          </div>
          <StatusChip status={status} />
        </div>
        <div className="mt-2.5">
          <h2 className="text-headline-sm font-headline-sm text-on-surface line-through decoration-secondary">
            {name}
          </h2>
          <p className="text-body-sm font-body-sm text-secondary flex items-center mt-0.5">
            <span className="material-symbols-outlined text-[15px] mr-1 text-secondary">place</span>
            {address}
          </p>
        </div>
        <div className="mt-3 pt-2 border-t border-outline-variant/60 flex items-center justify-between text-body-sm font-body-sm text-secondary">
          <span>{totalProducts}/{totalProducts} items unpacked</span>
          <span className="text-status-completed font-medium flex items-center gap-1">
            <span
              className="material-symbols-outlined text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            Verified by Shop Mgr
          </span>
        </div>
      </article>
    );
  }

  if (status === 'in_progress') {
    return (
      <article
        onClick={() => onOpenChecklist(stop.id)}
        className="bg-surface-container-lowest border-2 border-status-in-progress rounded-xl p-space-md relative overflow-hidden shadow-sm cursor-pointer"
      >
        <div className="absolute top-0 right-0 bg-status-in-progress text-on-primary px-2.5 py-0.5 rounded-bl text-[10px] font-bold tracking-wider uppercase">
          Current Stop
        </div>
        <div className="flex justify-between items-start pt-1">
          <div className="flex items-center space-x-2">
            <span className="flex items-center justify-center w-7 h-7 rounded-full bg-status-in-progress text-on-primary text-headline-sm font-headline-sm font-bold">
              {stopNumber}
            </span>
            <div>
              <span className="text-body-sm font-body-sm font-semibold text-status-in-progress">
                ETA {eta || '10:15 AM'}
              </span>
              <span className="text-body-sm font-body-sm text-secondary">
                {' '}• {distance || '1.4 mi away'}
              </span>
            </div>
          </div>
          <div className="mr-20">
            <StatusChip status={status} />
          </div>
        </div>

        <div className="mt-3">
          <h2 className="text-headline-md font-headline-md text-on-surface font-bold">
            {name}
          </h2>
          <p className="text-body-md font-body-md text-on-surface-variant flex items-center mt-1">
            <span className="material-symbols-outlined text-[16px] mr-1 text-status-in-progress">place</span>
            {address}
          </p>
        </div>

        {/* Bento Manifest & Docking strip */}
        <div className="mt-3 grid grid-cols-2 gap-2 bg-surface-container-low p-2 rounded border border-outline-variant">
          <div className="flex items-center space-x-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">inventory_2</span>
            <div>
              <p className="text-[11px] text-secondary font-medium">Manifest</p>
              <p className="text-label-sm font-label-sm font-bold text-on-surface">
                {totalProducts} products ({completedProducts} checked)
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 border-l border-outline-variant pl-2">
            <span className="material-symbols-outlined text-secondary text-[18px]">dock</span>
            <div>
              <p className="text-[11px] text-secondary font-medium">Docking Point</p>
              <p className="text-label-sm font-label-sm font-bold text-on-surface">{dock}</p>
            </div>
          </div>
        </div>

        {/* Touch action buttons with minimum 48px tap targets */}
        <div className="mt-4 flex space-x-2" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => onOpenChecklist(stop.id)}
            className="flex-1 min-h-[48px] bg-primary-container hover:bg-primary text-on-primary-container font-headline-sm text-headline-sm rounded-lg flex items-center justify-center space-x-2 active:scale-[0.99] transition-transform"
            type="button"
          >
            <span className="material-symbols-outlined text-[20px]">assignment_turned_in</span>
            <span>Open Checklist</span>
          </button>
          <button
            aria-label={`Navigate to ${name}`}
            onClick={() => onNavigate?.(stop)}
            className="w-12 min-h-[48px] border border-outline-variant bg-surface rounded-lg flex items-center justify-center text-primary active:bg-surface-container hover:border-primary transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[22px]">navigation</span>
          </button>
        </div>
      </article>
    );
  }

  if (status === 'attention') {
    return (
      <article
        onClick={() => onOpenChecklist(stop.id)}
        className="bg-surface-container-lowest border-l-4 border-l-status-error border-y border-r border-outline-variant rounded-xl p-space-md cursor-pointer hover:bg-surface-container-low transition-colors active:scale-[0.99]"
      >
        <div className="flex justify-between items-start">
          <div className="flex items-center space-x-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-error-container text-error text-label-sm font-label-sm font-bold">
              {stopNumber}
            </span>
            <span className="text-label-sm font-label-sm text-error font-medium">
              Action Required
            </span>
          </div>
          <StatusChip status={status} />
        </div>
        <div className="mt-2.5">
          <h2 className="text-headline-sm font-headline-sm text-on-surface">{name}</h2>
          <p className="text-body-sm font-body-sm text-secondary flex items-center mt-0.5">
            <span className="material-symbols-outlined text-[15px] mr-1 text-secondary">place</span>
            {address}
          </p>
        </div>
        {warningNote && (
          <div className="mt-2.5 bg-error-container/40 p-2 rounded text-body-sm font-body-sm text-on-surface flex items-center space-x-1.5 border border-error/20">
            <span className="material-symbols-outlined text-[16px] text-error flex-shrink-0">key</span>
            <span>{warningNote}</span>
          </div>
        )}
        <div className="mt-3 pt-2 border-t border-outline-variant flex items-center justify-between text-body-sm font-body-sm text-secondary">
          <span>{totalProducts} products to unpack</span>
          <span className="text-primary font-medium flex items-center gap-1">
            Tap to open
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </span>
        </div>
      </article>
    );
  }

  // Pending
  return (
    <article
      onClick={() => onOpenChecklist(stop.id)}
      className="bg-surface-container-lowest border border-outline-variant rounded-xl p-space-md cursor-pointer hover:bg-surface-container-low transition-colors active:scale-[0.99]"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-2">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-surface-container-highest text-secondary text-label-sm font-label-sm font-bold">
            {stopNumber}
          </span>
          <span className="text-label-sm font-label-sm text-secondary">
            Est. {eta || '11:00 AM'}
          </span>
        </div>
        <StatusChip status={status} />
      </div>
      <div className="mt-2.5">
        <h2 className="text-headline-sm font-headline-sm text-on-surface">{name}</h2>
        <p className="text-body-sm font-body-sm text-secondary flex items-center mt-0.5">
          <span className="material-symbols-outlined text-[15px] mr-1 text-secondary">place</span>
          {address}
        </p>
      </div>
      <div className="mt-3 pt-2 border-t border-outline-variant flex items-center justify-between text-body-sm font-body-sm text-secondary">
        <span>{totalProducts} products to unpack</span>
        <span className="text-outline">{dock || 'Curbside Dropoff'}</span>
      </div>
    </article>
  );
};
