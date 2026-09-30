// src/features/meter-photo/components/MeterPhotoScreen.tsx - Dedicated Apple-style vehicle meter photo capture screen

import React from 'react';
import { TopBar } from '@/shared/components/ui';
import { useMeterPhotoCapture } from '../hooks/useMeterPhotoCapture';
import { MeterPhotoCaptureBox } from './MeterPhotoCaptureBox';

export interface MeterPhotoScreenProps {
  moment: 'start' | 'end';
}

export const MeterPhotoScreen: React.FC<MeterPhotoScreenProps> = ({ moment }) => {
  const {
    state,
    previewUri,
    errorMessage,
    animPhase,
    prefersReducedMotion,
    cameraInputRef,
    libraryInputRef,
    handleFileInputChange,
    handleRetake,
    handleBack
  } = useMeterPhotoCapture({ moment });

  const isStart = moment === 'start';
  const stepLabel = isStart ? 'Before you start' : 'Route complete';
  const holdText = isStart ? 'Start recorded' : 'End recorded';
  const testId = isStart ? 'meter-photo-page-start' : 'meter-photo-page-end';

  return (
    <div
      data-testid={testId}
      className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none"
    >
      <TopBar
        title="Fleet Logistics"
        showBackButton={state !== 'processing'}
        onBack={handleBack}
      />

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        capture="environment"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        onChange={handleFileInputChange}
        className="hidden"
        aria-hidden="true"
      />

      <div
        className="flex-1 w-full max-w-[500px] mx-auto px-5 flex flex-col justify-between pt-2 overflow-y-auto"
        style={{
          paddingBottom: 'max(32px, calc(16px + env(safe-area-inset-bottom, 0px)))'
        }}
      >
        <section aria-label="Meter photo instructions" className="w-full space-y-1 pt-1 select-none">
          <p className="text-[13px] font-medium text-secondary tracking-tight">
            {stepLabel}
          </p>
          <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight mt-0.5">
            Photo of your meter
          </h1>
          <p className="text-[15px] text-secondary font-normal leading-snug mt-1">
            Take a clear photo of the dashboard meter.
          </p>
        </section>

        <div className="w-full my-auto py-2">
          <MeterPhotoCaptureBox
            state={state}
            previewUri={previewUri}
            animPhase={animPhase}
            prefersReducedMotion={prefersReducedMotion}
            onBoxClick={() => {
              if (state === 'empty') cameraInputRef.current?.click();
            }}
          />

          <div className="mt-3 text-center min-h-[36px] flex flex-col items-center justify-center">
            {errorMessage ? (
              <p className="text-[13px] font-medium text-critical leading-snug">
                {errorMessage}
              </p>
            ) : state === 'success' ? (
              <div className="flex flex-col items-center gap-1.5 animate-fadeIn">
                <span className="text-[15px] font-semibold text-black dark:text-white">
                  {holdText}
                </span>
                <button
                  type="button"
                  data-testid="meter-retake"
                  onClick={handleRetake}
                  className="text-[13px] font-medium text-secondary hover:text-action transition-colors cursor-pointer py-1 px-3 rounded-full hover:bg-surface border border-hairline/60"
                >
                  Retake
                </button>
              </div>
            ) : (
              <p className="text-[13px] text-secondary font-normal">
                Make sure the numbers are sharp and readable.
              </p>
            )}
          </div>
        </div>

        <div className="w-full flex flex-col gap-2.5 pt-2">
          {state !== 'success' ? (
            <>
              <button
                type="button"
                data-testid="meter-take-photo"
                disabled={state === 'processing'}
                onClick={() => cameraInputRef.current?.click()}
                className="w-full h-[52px] rounded-[12px] bg-action text-white text-[16px] font-semibold flex items-center justify-center gap-2 shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[20px]">photo_camera</span>
                Take Photo
              </button>

              <button
                type="button"
                data-testid="meter-choose-library"
                disabled={state === 'processing'}
                onClick={() => libraryInputRef.current?.click()}
                className="w-full h-[44px] text-secondary hover:text-black dark:hover:text-white text-[15px] font-medium flex items-center justify-center transition-colors disabled:opacity-50 cursor-pointer"
              >
                Choose from Library
              </button>
            </>
          ) : (
            <div className="h-[96px] flex items-center justify-center">
              <span className="text-[13px] text-secondary">
                Continuing…
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
