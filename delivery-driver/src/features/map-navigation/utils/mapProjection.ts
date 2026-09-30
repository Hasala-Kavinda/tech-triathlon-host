// src/features/map-navigation/utils/mapProjection.ts - Projection utilities for SVG vector map

import { Outlet } from '@/shared/types';

export const WORLD_WIDTH = 1200;
export const WORLD_HEIGHT = 900;

export interface ProjectedOutlet extends Outlet {
  px: number;
  py: number;
}

export function computeMapBounds(outlets: Outlet[]) {
  if (outlets.length === 0) {
    return { minLat: 7.15, maxLat: 7.35, minLng: 80.5, maxLng: 80.75 };
  }
  const lats = outlets.map((o) => o.lat);
  const lngs = outlets.map((o) => o.lng);
  return {
    minLat: Math.min(...lats) - 0.03,
    maxLat: Math.max(...lats) + 0.03,
    minLng: Math.min(...lngs) - 0.03,
    maxLng: Math.max(...lngs) + 0.03
  };
}

export function projectCoordinate(
  lat: number,
  lng: number,
  bounds: { minLat: number; maxLat: number; minLng: number; maxLng: number }
) {
  const x = ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * WORLD_WIDTH;
  const y = (1 - (lat - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * WORLD_HEIGHT;
  return { x, y };
}
