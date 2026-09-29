import React, { useState, useRef, useEffect } from 'react';

export interface SwipeBarProps {
  selectedRouteNumber: number | null;
  onComplete: () => void;
  overrideState?: 'loading' | 'disabled' | 'expanded' | 'activation' | 'ready' | 'dragging' | 'completed';
  overrideDragProgress?: number; // e.g. 0.5 for 50% dragging
  placeholderText?: string;
  readyText?: string;
  isReadyOverride?: boolean;
  hideKnobWhenDisabled?: boolean;
}

export const SwipeBar: React.FC<SwipeBarProps> = ({
  selectedRouteNumber,
  onComplete,
  overrideState,
  overrideDragProgress,
  placeholderText,
  readyText,
  isReadyOverride,
  hideKnobWhenDisabled
}) => {
  const isReady = isReadyOverride !== undefined
    ? isReadyOverride
    : overrideState
    ? ['activation', 'ready', 'dragging', 'completed'].includes(overrideState)
    : selectedRouteNumber !== null;

  const routeNum = selectedRouteNumber ?? (overrideState === 'ready' || overrideState === 'activation' || overrideState === 'dragging' ? 2 : 1);

  const [isActivating, setIsActivating] = useState(overrideState === 'activation');
  const [isCompleted, setIsCompleted] = useState(overrideState === 'completed');
  const [dragX, setDragX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState(false);
  const [maxSlide, setMaxSlide] = useState<number>(0);

  const trackRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const currentXRef = useRef(0);
  const prevReadyRef = useRef(isReady);

  // Update bounds
  const updateBounds = () => {
    if (trackRef.current && knobRef.current) {
      // track height is 56px, knob is 48px, inset 4px on each side
      const trackWidth = trackRef.current.offsetWidth;
      const knobWidth = knobRef.current.offsetWidth;
      // slide range from left: 4px to right: trackWidth - knobWidth - 4px
      const available = trackWidth - knobWidth - 8;
      setMaxSlide(available > 0 ? available : 0);
    }
  };

  useEffect(() => {
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, []);

  // Set drag state for override
  useEffect(() => {
    if (overrideState === 'dragging' && maxSlide > 0) {
      const progress = overrideDragProgress ?? 0.5;
      const initialDrag = maxSlide * progress;
      setDragX(initialDrag);
      currentXRef.current = initialDrag;
    }
  }, [overrideState, overrideDragProgress, maxSlide]);

  // Handle activation animation when route is selected
  useEffect(() => {
    if (overrideState === 'activation') {
      setIsActivating(true);
      return;
    }

    if (!prevReadyRef.current && isReady) {
      // Trigger 600ms activation
      setIsActivating(true);
      const timer = setTimeout(() => {
        setIsActivating(false);
      }, 650);
      return () => clearTimeout(timer);
    } else if (!isReady) {
      setIsActivating(false);
      setDragX(0);
      currentXRef.current = 0;
      setIsCompleted(false);
    }
    prevReadyRef.current = isReady;
  }, [isReady, overrideState]);

  // Touch & Mouse Event Handlers
  useEffect(() => {
    if (overrideState) return;

    const knob = knobRef.current;
    if (!knob) return;

    const onStart = (clientX: number) => {
      if (!isReady || isCompleted) return;
      isDraggingRef.current = true;
      setIsDragging(true);
      startXRef.current = clientX - currentXRef.current;
      knob.style.transition = 'none';
    };

    const onMove = (clientX: number) => {
      if (!isDraggingRef.current || isCompleted) return;
      let x = clientX - startXRef.current;
      if (x < 0) x = 0;
      if (x > maxSlide) x = maxSlide;
      currentXRef.current = x;
      setDragX(x);
    };

    const onEnd = () => {
      if (!isDraggingRef.current || isCompleted) return;
      isDraggingRef.current = false;
      setIsDragging(false);

      // Threshold is 85% of track
      const threshold = maxSlide * 0.85;
      if (maxSlide > 0 && currentXRef.current >= threshold) {
        // Snap complete
        currentXRef.current = maxSlide;
        setDragX(maxSlide);
        setIsCompleted(true);

        // Haptic feedback where supported
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          try {
            navigator.vibrate(10);
          } catch {
            // ignore
          }
        }

        // 150ms scale settle before navigation
        setTimeout(() => {
          onComplete();
        }, 180);
      } else {
        // Spring back to left
        currentXRef.current = 0;
        setDragX(0);
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches && e.touches[0]) {
        onStart(e.touches[0].clientX);
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isDraggingRef.current) {
        if (e.cancelable) e.preventDefault();
        if (e.touches && e.touches[0]) {
          onMove(e.touches[0].clientX);
        }
      }
    };

    const handleTouchEnd = () => onEnd();

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) onStart(e.clientX);
    };

    const handleMouseMove = (e: MouseEvent) => onMove(e.clientX);
    const handleMouseUp = () => onEnd();

    knob.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    knob.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      knob.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
      knob.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isReady, isCompleted, maxSlide, onComplete, overrideState]);

  // Derived progress (0 to 1)
  const dragRatio = maxSlide > 0 ? dragX / maxSlide : 0;
  const labelOpacity = Math.max(0, 1 - dragRatio * 1.5);
  const fillWidth = dragX > 0 ? dragX + 48 + 4 : 0;

  return (
    <div className="w-full px-5 py-2 select-none">
      {/* 56px Tall Fully Rounded Track with 20px side margins */}
      <div
        ref={trackRef}
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
        }}
        className={`relative w-full h-[56px] rounded-full p-1 flex items-center border select-none overflow-hidden backdrop-blur-md transition-all duration-300 ${
          isCompleted
            ? 'bg-action border-action scale-[0.98]'
            : isActivating
            ? 'bg-[var(--swipe-track)] border-action/40 ring-4 ring-action/30'
            : isReady
            ? 'bg-[var(--swipe-track)] border-hairline/50 shadow-sm'
            : 'bg-[var(--swipe-track)] border-[var(--swipe-border)] opacity-40 cursor-not-allowed'
        }`}
        role="button"
        aria-label={isReady ? `Swipe to start Route ${routeNum}` : 'Select a route to start'}
        aria-disabled={!isReady}
      >
        {/* Accent Color Drag Fill behind knob */}
        <div
          style={{
            width: isCompleted ? '100%' : `${fillWidth}px`,
            transition: isDragging ? 'none' : 'width 0.3s cubic-bezier(0.2, 0.9, 0.3, 1)'
          }}
          className="absolute left-0 top-0 bottom-0 bg-action rounded-full pointer-events-none"
        />

        {/* Center Label (15px): Shimmer & placeholder use text-secondary */}
        <div
          style={{ opacity: isReady ? labelOpacity : 1 }}
          className={`w-full text-center px-12 pointer-events-none text-[15px] font-normal tracking-tight transition-opacity duration-300 relative z-10 ${
            isCompleted ? 'text-action-text font-medium' : 'text-secondary'
          }`}
        >
          {isReady ? (
            /* Route selected: Subtle text shimmer left-to-right */
            <span
              className={`inline-block ${
                !isDragging && !isCompleted ? 'apple-text-shimmer' : ''
              }`}
            >
              {readyText || `Swipe to start Route ${routeNum}`}
            </span>
          ) : (
            <span>{placeholderText || 'Select a route to start'}</span>
          )}
        </div>

        {/* 48px Circular Knob inset 4px from the left (White Knob) */}
        {(!hideKnobWhenDisabled || isReady || isCompleted) && (
          <div
            ref={knobRef}
            style={{
              transform: `translateX(${dragX}px)`,
              transition: isDragging
                ? 'none'
                : 'transform 0.3s cubic-bezier(0.2, 0.9, 0.3, 1), opacity 0.3s ease'
            }}
            className={`absolute left-1 top-1 w-[48px] h-[48px] rounded-full flex items-center justify-center bg-white shadow-[0_2px_8px_rgba(0,0,0,0.14)] z-20 touch-none select-none ${
              isActivating ? 'animate-knob-nudge' : ''
            } ${
              isCompleted
                ? 'cursor-default'
                : isReady
                ? 'cursor-grab active:cursor-grabbing opacity-100'
                : 'cursor-not-allowed'
            }`}
          >
            <span
              className={`material-symbols-outlined text-[20px] transition-colors select-none ${
                isCompleted
                  ? 'text-action'
                  : isReady
                  ? 'text-primary/70'
                  : 'text-secondary/40'
              }`}
            >
              {isCompleted ? 'check' : 'chevron_right'}
            </span>
          </div>
        )}
      </div>

      <style>{`
        @keyframes textShimmerAnim {
          0% {
            background-position: -200% 0;
          }
          100% {
            background-position: 200% 0;
          }
        }
        .apple-text-shimmer {
          background: linear-gradient(
            90deg,
            var(--text-secondary) 0%,
            var(--text-primary) 50%,
            var(--text-secondary) 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: textShimmerAnim 2.5s infinite linear;
        }
        @keyframes knobNudgeAnim {
          0% { transform: translateX(0px); }
          40% { transform: translateX(14px); }
          100% { transform: translateX(0px); }
        }
        .animate-knob-nudge {
          animation: knobNudgeAnim 0.6s cubic-bezier(0.25, 1, 0.5, 1);
        }
        @media (prefers-reduced-motion: reduce) {
          .apple-text-shimmer {
            animation: none !important;
            -webkit-text-fill-color: inherit !important;
          }
          .animate-knob-nudge {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
