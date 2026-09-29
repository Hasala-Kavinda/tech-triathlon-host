// app/src/components/screens/MeterPhotoScreen.tsx - Dedicated Apple-style vehicle meter photo capture screen

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useStore, MeterPhotoRecord } from '../../state/store';
import { TopBar } from '../shared/TopBar';

export interface MeterPhotoScreenProps {
  moment: 'start' | 'end';
}

export const MeterPhotoScreen: React.FC<MeterPhotoScreenProps> = ({ moment }) => {
  const {
    selectedRoute,
    routes,
    meterPhotos,
    setRouteMeterPhoto,
    pushScreen,
    replaceScreen,
    popScreen,
    conditions,
    track
  } = useStore();

  // Resolve target route
  const currentRoute = selectedRoute || routes.find((r) => r.status === 'in_progress') || routes[0];
  const routeId = currentRoute ? currentRoute.id : 1;
  const existingPhoto = meterPhotos[routeId]?.[moment];

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNavigatingRef = useRef<boolean>(false);
  const activeObjectUrlRef = useRef<string | null>(null);

  const [state, setState] = useState<'empty' | 'processing' | 'success'>('empty');
  const [previewUri, setPreviewUri] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [animPhase, setAnimPhase] = useState<'photo-in' | 'draw-check' | 'hold' | 'advance'>('photo-in');

  // Check if reduced motion is requested
  const prefersReducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Immediate bypass if photo already exists for this route run
  useEffect(() => {
    if (existingPhoto && !isNavigatingRef.current) {
      isNavigatingRef.current = true;
      if (moment === 'start') {
        replaceScreen('dashboard');
      } else {
        replaceScreen('shift_summary');
      }
    }
  }, [existingPhoto, moment, replaceScreen]);

  // Clean up timers & Object URLs on unmount
  useEffect(() => {
    return () => {
      if (autoAdvanceTimerRef.current) {
        clearTimeout(autoAdvanceTimerRef.current);
      }
      if (activeObjectUrlRef.current) {
        URL.revokeObjectURL(activeObjectUrlRef.current);
      }
    };
  }, []);

  const handleBack = () => {
    popScreen();
  };

  const clearCurrentPhoto = useCallback(() => {
    if (autoAdvanceTimerRef.current) {
      clearTimeout(autoAdvanceTimerRef.current);
      autoAdvanceTimerRef.current = null;
    }
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    setPreviewUri(null);
    setState('empty');
    setErrorMessage(null);
    setAnimPhase('photo-in');
  }, []);

  const handleRetake = () => {
    track(moment === 'start' ? 'MP_RETAKE_START' : 'MP_RETAKE_END');
    clearCurrentPhoto();
  };

  const processFile = async (file: File) => {
    // 1. Validation: file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const validExtensions = /\.(jpe?g|png|webp|heic|heif)$/i;
    if (!validTypes.includes(file.type.toLowerCase()) && !validExtensions.test(file.name)) {
      setErrorMessage("That file isn't a photo. Please try again.");
      setState('empty');
      return;
    }

    // 2. Validation: file size (10 MB max)
    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Photo exceeds 10MB limit. Please choose a smaller photo.');
      setState('empty');
      return;
    }

    setErrorMessage(null);
    setState('processing');

    try {
      // Create Object URL for clean preview & Canvas downscaling
      const objectUrl = URL.createObjectURL(file);
      activeObjectUrlRef.current = objectUrl;

      // Downscale to ~1600px max edge client-side
      const compressedDataUri = await new Promise<string>((resolve) => {
        const img = new Image();
        img.onload = () => {
          const maxDim = 1600;
          let { width, height } = img;
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            } else {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.86));
          } else {
            resolve(objectUrl);
          }
        };
        img.onerror = () => {
          resolve(objectUrl);
        };
        img.src = objectUrl;
      });

      // Save to store keyed by route ID
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const record: MeterPhotoRecord = {
        photoUri: compressedDataUri,
        capturedAt: timeStr,
        rawFile: file,
        syncStatus: conditions.networkStatus === 'offline' ? 'pending' : 'synced'
      };
      setRouteMeterPhoto(routeId, moment, record);

      setPreviewUri(compressedDataUri);
      setState('success');
      track(moment === 'start' ? 'MP_CAPTURE_START' : 'MP_CAPTURE_END');

      // Apple-like timing sequence:
      // 0-250ms: photo scale/fade in
      // 200-650ms: draw checkmark
      // 650-1100ms: hold ("Meter recorded" + Retake visible)
      // 1100-1400ms: auto advance to next screen
      if (prefersReducedMotion) {
        setAnimPhase('hold');
        autoAdvanceTimerRef.current = setTimeout(() => {
          advanceToNext();
        }, 800);
      } else {
        setAnimPhase('photo-in');

        setTimeout(() => {
          setAnimPhase('draw-check');
        }, 200);

        setTimeout(() => {
          setAnimPhase('hold');
        }, 650);

        autoAdvanceTimerRef.current = setTimeout(() => {
          advanceToNext();
        }, 1250);
      }
    } catch {
      setErrorMessage('Could not process photo. Please try again.');
      setState('empty');
    }
  };

  const advanceToNext = () => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    if (moment === 'start') {
      replaceScreen('dashboard');
    } else {
      replaceScreen('shift_summary');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    // Reset file input so re-selecting same file triggers change
    e.target.value = '';
  };

  const isStart = moment === 'start';
  const stepLabel = isStart ? 'Before you start' : 'Route complete';
  const holdText = isStart ? 'Start recorded' : 'End recorded';
  const testId = isStart ? 'meter-photo-page-start' : 'meter-photo-page-end';

  return (
    <div
      data-testid={testId}
      className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none"
    >
      {/* 1. Quiet TopBar */}
      <TopBar
        title="Fleet Logistics"
        showBackButton={state !== 'processing'}
        onBack={handleBack}
      />

      {/* Hidden File Inputs */}
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

      {/* Main Content Area: Centered column scaling smoothly to tablet */}
      <div
        className="flex-1 w-full max-w-[500px] mx-auto px-5 flex flex-col justify-between pt-2 overflow-y-auto"
        style={{
          paddingBottom: 'max(32px, calc(16px + env(safe-area-inset-bottom, 0px)))'
        }}
      >
        {/* Header Block */}
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

        {/* Hero Capture Box (approx 4:3 ratio) */}
        <div className="w-full my-auto py-2">
          <div
            onClick={() => {
              if (state === 'empty') {
                cameraInputRef.current?.click();
              }
            }}
            className={`w-full aspect-[4/3] rounded-[20px] border border-hairline bg-surface relative overflow-hidden flex flex-col items-center justify-center transition-all ${
              state === 'empty' ? 'cursor-pointer hover:border-action/40 active:scale-[0.99]' : ''
            }`}
          >
            {/* Viewfinder corner marks hint */}
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

            {/* State: PROCESSING Shimmer */}
            {state === 'processing' && (
              <div className="w-full h-full flex flex-col items-center justify-center bg-surface animate-pulse gap-3">
                <div className="w-10 h-10 rounded-full border-2 border-action border-t-transparent animate-spin" />
                <span className="text-[13px] font-medium text-secondary">Processing meter photo…</span>
              </div>
            )}

            {/* State: SUCCESS (Photo + Apple-style checkmark draw animation) */}
            {state === 'success' && previewUri && (
              <div className="w-full h-full relative overflow-hidden rounded-[20px]">
                <img
                  src={previewUri}
                  alt="Vehicle meter reading"
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    animPhase === 'photo-in' ? 'scale-[0.98] opacity-80' : 'scale-100 opacity-100'
                  }`}
                />

                {/* Soft dimmed overlay for high-contrast checkmark */}
                <div className="absolute inset-0 bg-black/25 backdrop-blur-[1px] flex items-center justify-center">
                  {/* Apple SVG circular checkmark draw */}
                  <div
                    className={`transition-all duration-300 transform ${
                      animPhase === 'photo-in' ? 'scale-90 opacity-0' : 'scale-100 opacity-100'
                    }`}
                  >
                    <svg className="w-20 h-20" viewBox="0 0 72 72" fill="none">
                      {/* Circle background */}
                      <circle
                        cx="36"
                        cy="36"
                        r="32"
                        className="stroke-white/20"
                        strokeWidth="3.5"
                      />
                      {/* Animated circle stroke */}
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
                      {/* Animated checkmark path */}
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

          {/* Under-hero status / helper text */}
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

        {/* Action Controls Section */}
        <div className="w-full flex flex-col gap-2.5 pt-2">
          {state !== 'success' ? (
            <>
              {/* Primary: Take Photo */}
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

              {/* Secondary: Choose from Library */}
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
