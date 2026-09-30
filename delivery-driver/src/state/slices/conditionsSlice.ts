// src/state/slices/conditionsSlice.ts - Prototype conditions & meter photo records

import { useState, useCallback } from 'react';
import { PrototypeConditions, MeterPhotoRecord, RouteMeterPhotos } from '@/shared/types';

export const DEFAULT_CONDITIONS: PrototypeConditions = {
  networkStatus: 'good',
  gpsStatus: 'off',
  gpsQuality: 'strong',
  driverNearNextOutlet: false,
  nextPinResult: 'normal'
};

export function useConditionsSlice(track: (id: string) => void) {
  const [conditions, setConditions] = useState<PrototypeConditions>(DEFAULT_CONDITIONS);
  const [meterPhotos, setMeterPhotos] = useState<Record<number, RouteMeterPhotos>>({});

  const setRouteMeterPhoto = useCallback(
    (routeId: number, moment: 'start' | 'end', record: MeterPhotoRecord) => {
      setMeterPhotos((prev) => ({
        ...prev,
        [routeId]: {
          ...prev[routeId],
          [moment]: record
        }
      }));
    },
    []
  );

  const clearRouteMeterPhotos = useCallback((routeId: number) => {
    setMeterPhotos((prev) => {
      const next = { ...prev };
      delete next[routeId];
      return next;
    });
  }, []);

  const markMeterPhotosSynced = useCallback(() => {
    setMeterPhotos((prev) => {
      const next: Record<number, RouteMeterPhotos> = {};
      for (const [rId, photos] of Object.entries(prev)) {
        next[Number(rId)] = {
          start: photos.start ? { ...photos.start, syncStatus: 'synced' } : undefined,
          end: photos.end ? { ...photos.end, syncStatus: 'synced' } : undefined
        };
      }
      return next;
    });
  }, []);

  const updateCondition = useCallback(
    <K extends keyof PrototypeConditions>(key: K, value: PrototypeConditions[K]) => {
      setConditions((prev) => ({ ...prev, [key]: value }));
      if (key === 'networkStatus' || key === 'gpsStatus' || key === 'gpsQuality') {
        track('L04');
      }
    },
    [track]
  );

  return {
    conditions,
    setConditions,
    updateCondition,
    meterPhotos,
    setMeterPhotos,
    setRouteMeterPhoto,
    clearRouteMeterPhotos,
    markMeterPhotosSynced
  };
}
