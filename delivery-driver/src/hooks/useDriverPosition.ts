import { useEffect } from 'react';
import { useDriver, DriverPosition, GpsStatus } from '../state/driverContext';

let activeWatchId: number | null = null;
let watcherRefCount = 0;

/**
 * Shared geolocation hook backed by DriverContext.
 * Ensures exactly ONE shared watchPosition watcher is ever active across the whole app.
 */
export function useDriverPosition(): {
  driverPosition: DriverPosition | null;
  gpsStatus: GpsStatus;
  requestGps: () => void;
  setGpsStatus: (status: GpsStatus) => void;
  setDriverPosition: (pos: DriverPosition | null) => void;
} {
  const {
    driverPosition,
    gpsStatus,
    setDriverPosition,
    setGpsStatus,
    requestGps
  } = useDriver();

  useEffect(() => {
    // Only attempt real watcher if GPS is 'on' or 'requesting' and geolocation API exists
    if (gpsStatus !== 'on' && gpsStatus !== 'requesting') {
      return;
    }

    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      return;
    }

    watcherRefCount++;

    if (activeWatchId === null) {
      try {
        activeWatchId = navigator.geolocation.watchPosition(
          (pos) => {
            setDriverPosition({
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracyMeters: pos.coords.accuracy || 15
            });
            if (gpsStatus !== 'on') {
              setGpsStatus('on');
            }
          },
          (err) => {
            if (err.code === err.PERMISSION_DENIED) {
              setGpsStatus('blocked');
            } else if (err.code === err.POSITION_UNAVAILABLE) {
              setGpsStatus('unavailable');
            }
          },
          {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 10000
          }
        );
      } catch {
        // Fallback silently
      }
    }

    return () => {
      watcherRefCount--;
      if (watcherRefCount <= 0 && activeWatchId !== null) {
        navigator.geolocation.clearWatch(activeWatchId);
        activeWatchId = null;
        watcherRefCount = 0;
      }
    };
  }, [gpsStatus, setDriverPosition, setGpsStatus]);

  return {
    driverPosition,
    gpsStatus,
    requestGps,
    setGpsStatus,
    setDriverPosition
  };
}
