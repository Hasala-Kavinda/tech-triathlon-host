// src/features/map-navigation/components/MapNavigationControls.tsx - Floating map controls

import React from 'react';
import { PrototypeConditions } from '@/shared/types';

export interface MapNavigationControlsProps {
  canZoomIn: boolean;
  canZoomOut: boolean;
  isLocating: boolean;
  conditions: PrototypeConditions;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onRecenter: () => void;
  onTurnOnGps: () => void;
}

export const MapNavigationControls: React.FC<MapNavigationControlsProps> = ({
  canZoomIn,
  canZoomOut,
  isLocating,
  conditions,
  onZoomIn,
  onZoomOut,
  onRecenter,
  onTurnOnGps
}) => {
  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2.5 pointer-events-auto select-none">
      {/* Zoom Group */}
      <div className="bg-surface/90 dark:bg-[#141D45]/95 backdrop-blur-md border border-hairline rounded-2xl shadow-lg flex flex-col overflow-hidden">
        <button
          type="button"
          onClick={onZoomIn}
          disabled={!canZoomIn}
          aria-label="Zoom in"
          className={`w-11 h-11 flex items-center justify-center border-b border-hairline/50 focus:outline-none transition-all ${
            !canZoomIn
              ? 'cursor-not-allowed'
              : 'text-text-primary hover:bg-hairline/20 active:scale-95 cursor-pointer'
          }`}
        >
          <span
            style={!canZoomIn ? { filter: 'blur(1.5px)' } : undefined}
            className={`material-symbols-outlined text-[20px] transition-all select-none ${
              !canZoomIn ? 'blur-[1.5px] opacity-35 text-secondary' : 'text-text-primary'
            }`}
          >
            add
          </span>
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          disabled={!canZoomOut}
          aria-label="Zoom out"
          className={`w-11 h-11 flex items-center justify-center focus:outline-none transition-all ${
            !canZoomOut
              ? 'cursor-not-allowed'
              : 'text-text-primary hover:bg-hairline/20 active:scale-95 cursor-pointer'
          }`}
        >
          <span
            style={!canZoomOut ? { filter: 'blur(1.5px)' } : undefined}
            className={`material-symbols-outlined text-[20px] transition-all select-none ${
              !canZoomOut ? 'blur-[1.5px] opacity-35 text-secondary' : 'text-text-primary'
            }`}
          >
            remove
          </span>
        </button>
      </div>

      {/* Recenter & Fit Route Button */}
      <button
        type="button"
        onClick={onRecenter}
        aria-label="Fit entire route on map"
        className="w-11 h-11 rounded-2xl bg-surface/90 dark:bg-[#141D45]/95 backdrop-blur-md border border-hairline shadow-lg flex items-center justify-center text-text-primary hover:bg-hairline/20 active:scale-95 transition-transform cursor-pointer focus:outline-none"
      >
        <span className="material-symbols-outlined text-[20px]">crop_free</span>
      </button>

      {/* GPS Toggle */}
      <button
        type="button"
        onClick={onTurnOnGps}
        aria-label={conditions.gpsStatus === 'on' ? 'GPS is active' : 'Turn on GPS'}
        className={`w-11 h-11 rounded-2xl border shadow-lg flex items-center justify-center transition-all cursor-pointer focus:outline-none ${
          conditions.gpsStatus === 'on'
            ? 'bg-action text-white border-action'
            : 'bg-surface/90 dark:bg-[#141D45]/95 backdrop-blur-md border-hairline text-text-secondary hover:bg-hairline/20'
        }`}
      >
        <span className={`material-symbols-outlined text-[20px] ${isLocating ? 'animate-spin' : ''}`}>
          {conditions.gpsStatus === 'on' ? 'near_me' : 'location_searching'}
        </span>
      </button>
    </div>
  );
};
