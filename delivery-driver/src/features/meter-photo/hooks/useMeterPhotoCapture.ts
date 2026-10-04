// src/features/meter-photo/hooks/useMeterPhotoCapture.ts - Hook handling meter photo file compression, validation, and auto-advance

import { useState, useRef, useEffect, useCallback } from 'react';
import { useStore } from '@/state/store';
import { MeterPhotoRecord } from '@/shared/types';
import { useReducedMotion } from '@/shared/hooks/useReducedMotion';
import { driverApi } from '@/api/driver';
import { flushSyncQueue, pendingMutationCount } from '@/offline/syncQueue';

export interface UseMeterPhotoCaptureProps {
  moment: 'start' | 'end';
}

export function useMeterPhotoCapture({ moment }: UseMeterPhotoCaptureProps) {
  const {
    selectedRoute,
    routes,
    meterPhotos,
    setRouteMeterPhoto,
    setRouteVersion,
    startRoute,
    finishRoute,
    replaceScreen,
    popScreen,
    conditions,
    track
  } = useStore();

  const prefersReducedMotion = useReducedMotion();
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

  const advanceToNext = useCallback(() => {
    if (isNavigatingRef.current) return;
    isNavigatingRef.current = true;
    if (moment === 'start') {
      replaceScreen('dashboard');
    } else {
      replaceScreen('shift_summary');
    }
  }, [moment, replaceScreen]);

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

  // Cleanup on unmount
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
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const validExtensions = /\.(jpe?g|png|webp|heic|heif)$/i;
    if (!validTypes.includes(file.type.toLowerCase()) && !validExtensions.test(file.name)) {
      setErrorMessage("That file isn't a photo. Please try again.");
      setState('empty');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('Photo exceeds 10MB limit. Please choose a smaller photo.');
      setState('empty');
      return;
    }

    setErrorMessage(null);
    setState('processing');

    try {
      let fileAssetId: string | undefined;
      if (import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE !== 'true') {
        if (!currentRoute?.apiId || currentRoute.version === undefined) throw new Error('The live route is not ready for evidence upload.');
        if (conditions.networkStatus === 'offline' || !navigator.onLine) throw new Error(`Reconnect to ${moment === 'start' ? 'start' : 'finish'} the trip. The meter photo is uploaded first.`);
        let version = currentRoute.version;
        if (moment === 'start') {
          if (!currentRoute.claimed || !currentRoute.vehicleConfirmed) throw new Error('Claim the route and confirm the vehicle before starting.');
        } else {
          // Every stop must be on the server before the trip can finish.
          await flushSyncQueue();
          const waiting = await pendingMutationCount();
          if (waiting > 0) throw new Error(`${waiting} stop ${waiting === 1 ? 'change is' : 'changes are'} still saved only on this phone. Check your connection so they can sync, then try again.`);
          version = (await driverApi.tripDetail(currentRoute.apiId)).version;
        }
        fileAssetId = await driverApi.uploadEvidence(currentRoute.apiId, moment === 'start' ? 'start_meter' : 'end_meter', file);
        const capturedAt = new Date().toISOString();
        const updated = moment === 'start'
          ? await driverApi.startTrip(currentRoute.apiId, version, fileAssetId, capturedAt)
          : await driverApi.finishTrip(currentRoute.apiId, version, fileAssetId, capturedAt);
        setRouteVersion(currentRoute.id, updated.version);
        // The trip only counts as started (or finished) here, after the server has accepted it.
        if (moment === 'start') startRoute(currentRoute.id);
        else finishRoute(currentRoute.id);
      }
      const objectUrl = URL.createObjectURL(file);
      activeObjectUrlRef.current = objectUrl;

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

      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const record: MeterPhotoRecord = {
        fileAssetId,
        photoUri: compressedDataUri,
        capturedAt: timeStr,
        rawFile: file,
        syncStatus: conditions.networkStatus === 'offline' ? 'pending' : 'synced'
      };
      setRouteMeterPhoto(routeId, moment, record);

      setPreviewUri(compressedDataUri);
      setState('success');
      track(moment === 'start' ? 'MP_CAPTURE_START' : 'MP_CAPTURE_END');

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
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Could not process photo. Please try again.');
      setState('empty');
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
    e.target.value = '';
  };

  return {
    state,
    previewUri,
    errorMessage,
    animPhase,
    prefersReducedMotion,
    cameraInputRef,
    libraryInputRef,
    handleFileInputChange,
    handleRetake,
    handleBack: popScreen
  };
}
