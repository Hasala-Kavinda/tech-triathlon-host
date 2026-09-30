// src/state/slices/trackingSlice.ts - Function tracker and toast notifications

import { useState, useCallback } from 'react';

export function useTrackingSlice() {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [trackedFunctions, setTrackedFunctions] = useState<Record<string, boolean>>({
    G01: true // G01 App opens on Login Stage A
  });

  const track = useCallback((id: string) => {
    setTrackedFunctions((prev) => {
      if (prev[id]) return prev;
      return { ...prev, [id]: true };
    });
  }, []);

  const showToast = useCallback(
    (msg: string) => {
      setToastMessage(msg);
      track('G02');
      setTimeout(() => {
        setToastMessage((current) => (current === msg ? null : current));
      }, 1800);
    },
    [track]
  );

  const resetTicks = useCallback(() => {
    setTrackedFunctions({ G01: true });
  }, []);

  return {
    toastMessage,
    showToast,
    trackedFunctions,
    setTrackedFunctions,
    track,
    resetTicks
  };
}
