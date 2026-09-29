// app/src/components/shared/SwipeBar.tsx - Interactive drag swipe bar with activation animation and 85% threshold

import React, { useState, useRef, useEffect, useCallback } from 'react';

export interface SwipeBarProps {
  onComplete: () => void;
  selectedRouteNumber?: number;
  isInProgress?: boolean;
  isReadyOverride?: boolean;
  placeholderText?: string;
  readyText?: string;
  hideKnobWhenDisabled?: boolean;
  onTrackCompletion?: () => void;
}

export const SwipeBar: React.FC<SwipeBarProps> = ({
  onComplete,
  selectedRouteNumber,
  isInProgress = false,
  isReadyOverride = false,
  placeholderText = 'Select a route to start',
  readyText,
  hideKnobWhenDisabled = false,
  onTrackCompletion
}) => {
  const isReady = isReadyOverride || !!selectedRouteNumber;
  const labelText = isReady
    ? readyText || (isInProgress ? `Swipe to resume Route ${selectedRouteNumber}` : `Swipe to start Route ${selectedRouteNumber}`)
    : placeholderText;

  const trackRef = useRef<HTMLDivElement>(null);
  const [dragProgress, setDragProgress] = useState(0); // 0 to 1
  const [isDragging, setIsDragging] = useState(false);
  const [isNudging, setIsNudging] = useState(false);
  const prevRouteRef = useRef<number | undefined>(selectedRouteNumber);

  // Trigger one soft ring pulse and 14px nudge on route activation
  useEffect(() => {
    if (selectedRouteNumber && selectedRouteNumber !== prevRouteRef.current) {
      setIsNudging(true);
      const timer = setTimeout(() => setIsNudging(false), 400);
      prevRouteRef.current = selectedRouteNumber;
      return () => clearTimeout(timer);
    }
    prevRouteRef.current = selectedRouteNumber;
  }, [selectedRouteNumber]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (!isReady) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const knobWidth = 48;
    const maxDrag = rect.width - knobWidth - 8;
    const currentX = e.clientX - rect.left - 24;
    const progress = Math.max(0, Math.min(1, currentX / maxDrag));
    setDragProgress(progress);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging || !trackRef.current) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    if (dragProgress >= 0.85) {
      // Completed: animate to 100% in 150ms, then trigger onComplete
      setDragProgress(1);
      if (onTrackCompletion) onTrackCompletion();
      setTimeout(() => {
        onComplete();
        setDragProgress(0);
      }, 150);
    } else {
      // Spring back
      setDragProgress(0);
    }
  };

  const knobOffsetPx = trackRef.current
    ? dragProgress * (trackRef.current.clientWidth - 56)
    : dragProgress * 300;

  return (
    <div className="w-full px-4 select-none">
      <div
        ref={trackRef}
        className={`relative h-[56px] w-full rounded-2xl border transition-all duration-200 overflow-hidden flex items-center justify-center p-1 ${
          isReady
            ? 'bg-neutral-200/70 dark:bg-white/[0.08] border-hairline'
            : 'bg-neutral-100 dark:bg-white/[0.04] border-hairline/60 opacity-80 cursor-not-allowed'
        } ${isNudging ? 'ring-2 ring-action ring-opacity-40' : ''}`}
        style={{
          touchAction: 'none'
        }}
      >
        {/* Fill track behind knob */}
        <div
          className="absolute left-0 top-0 bottom-0 bg-action/20 dark:bg-action/30 rounded-2xl pointer-events-none transition-all"
          style={{
            width: isDragging || dragProgress > 0 ? `${knobOffsetPx + 52}px` : '0px',
            transition: isDragging ? 'none' : 'width 200ms cubic-bezier(0.2, 0, 0, 1)'
          }}
        />

        {/* Center label */}
        <span
          className={`text-[15px] font-medium tracking-tight text-center transition-opacity pointer-events-none z-10 ${
            isReady ? 'text-black dark:text-white' : 'text-secondary'
          }`}
          style={{
            opacity: Math.max(0, 1 - dragProgress * 1.5)
          }}
        >
          {labelText}
        </span>

        {/* Swipe Knob */}
        {(!hideKnobWhenDisabled || isReady) && (
          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            className={`absolute left-1.5 top-1.5 bottom-1.5 w-12 rounded-xl bg-white dark:bg-[#1E2750] shadow-md border border-black/5 dark:border-white/10 flex items-center justify-center cursor-grab active:cursor-grabbing z-20 transition-transform ${
              isDragging ? 'scale-105' : 'scale-100'
            } ${isNudging ? 'translate-x-[14px]' : ''}`}
            style={{
              transform: isDragging || dragProgress > 0 ? `translateX(${knobOffsetPx}px)` : undefined,
              transition: isDragging
                ? 'transform 0s'
                : isNudging
                ? 'transform 200ms ease-out'
                : 'transform 200ms cubic-bezier(0.2, 0, 0, 1)'
            }}
          >
            <span className="material-symbols-outlined text-[20px] text-action">
              chevron_right
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
