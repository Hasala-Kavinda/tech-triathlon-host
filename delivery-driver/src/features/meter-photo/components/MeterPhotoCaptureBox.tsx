// src/features/meter-photo/components/MeterPhotoCaptureBox.tsx - Hero capture box with animated checkmark

import React from 'react';

export interface MeterPhotoCaptureBoxProps {
  state: 'empty' | 'processing' | 'success';
  previewUri: string | null;
  animPhase: 'photo-in' | 'draw-check' | 'hold' | 'advance';
  prefersReducedMotion: boolean;
  onBoxClick: () => void;
}

export const MeterPhotoCaptureBox: React.FC<MeterPhotoCaptureBoxProps> = ({
  state,
  previewUri,
  animPhase,
  prefersReducedMotion,
  onBoxClick
}) => {
  return (
    <div
      onClick={onBoxClick}
      className={`w-full aspect-[4/3] rounded-[20px] border border-hairline bg-surface relative overflow-hidden flex flex-col items-center justify-center transition-all ${
        state === 'empty' ? 'cursor-pointer hover:border-action/40 active:scale-[0.99]' : ''
      }`}
    >
      {/* Viewfinder corner marks */}
      {state === 'empty' && (
        <>
          <div className="absolute top-3 left-3 w-3 h-3 border-t-2 border-l-2 border-hairline/80 rounded-tl-sm pointer-events-none" />
          <div className="absolute top-3 right-3 w-3 h-3 border-t-2 border-r-2 border-hairline/80 rounded-tr-sm pointer-events-none" />
          <div className="absolute bottom-3 left-3 w-3 h-3 border-b-2 border-l-2 border-hairline/80 rounded-bl-sm pointer-events-none" />
          <div className="absolute bottom-3 right-3 w-3 h-3 border-b-2 border-r-2 border-hairline/80 rounded-br-sm pointer-events-none" />
        </>
      )}

      {/* State: EMPTY */}
      {state === 'empty' && (
        <div className="flex flex-col items-center justify-center gap-2.5 text-secondary">
          <div className="w-12 h-12 rounded-full bg-bg flex items-center justify-center text-secondary">
            <span className="material-symbols-outlined text-[26px]">photo_camera</span>
          </div>
          <span className="text-[14px] font-medium text-secondary">Tap to capture</span>
        </div>
      )}

      {/* State: PROCESSING */}
      {state === 'processing' && (
        <div className="w-full h-full flex flex-col items-center justify-center bg-surface animate-pulse gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-action border-t-transparent animate-spin" />
          <span className="text-[13px] font-medium text-secondary">Processing meter photo…</span>
        </div>
      )}

      {/* State: SUCCESS */}
      {state === 'success' && previewUri && (
        <div className="w-full h-full relative overflow-hidden rounded-[20px]">
          <img
            src={previewUri}
            alt="Vehicle meter reading"
            className={`w-full h-full object-cover transition-all duration-300 ${
              animPhase === 'photo-in' ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'
            }`}
          />

          <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px] flex items-center justify-center">
            <div
              className={`transition-all duration-300 transform ${
                animPhase === 'photo-in' ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
              }`}
            >
              <svg className="w-20 h-20" viewBox="0 0 72 72" fill="none">
                <circle
                  cx="36"
                  cy="36"
                  r="32"
                  className="stroke-white/20"
                  strokeWidth="3.5"
                />
                <circle
                  cx="36"
                  cy="36"
                  r="32"
                  stroke="#00C46A"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 202,
                    strokeDashoffset:
                      prefersReducedMotion || animPhase !== 'photo-in' ? 0 : 202,
                    transition: prefersReducedMotion
                      ? 'none'
                      : 'stroke-dashoffset 400ms cubic-bezier(0.16, 1, 0.3, 1)'
                  }}
                />
                <path
                  d="M22 36.5L31.5 46L50 26.5"
                  stroke="#00C46A"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    strokeDasharray: 50,
                    strokeDashoffset:
                      prefersReducedMotion || (animPhase !== 'photo-in' && animPhase !== 'draw-check')
                        ? 0
                        : animPhase === 'draw-check'
                        ? 0
                        : 50,
                    transition: prefersReducedMotion
                      ? 'none'
                      : 'stroke-dashoffset 300ms cubic-bezier(0.16, 1, 0.3, 1) 150ms'
                  }}
                />
              </svg>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
