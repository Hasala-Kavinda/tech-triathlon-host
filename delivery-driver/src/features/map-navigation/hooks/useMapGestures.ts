// src/features/map-navigation/hooks/useMapGestures.ts - Pan, zoom, and touch gesture handling

import { useState, useRef, useCallback, useEffect } from 'react';
import { WORLD_WIDTH, WORLD_HEIGHT } from '../utils/mapProjection';

export const MIN_ZOOM = 0.6;
export const MAX_ZOOM = 2.5;

export function useMapGestures() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchStartDistRef = useRef<number | null>(null);

  const recenter = useCallback((_animate = true) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const isTablet = rect.width >= 768;

    const centerX = WORLD_WIDTH / 2;
    const centerY = WORLD_HEIGHT / 2;

    const viewCenterX = isTablet ? (rect.width + 380) / 2 : rect.width / 2;
    const viewCenterY = isTablet ? rect.height / 2 : (rect.height - 180) / 2;
    const targetZoom = isTablet ? Math.min(rect.width / 1300, rect.height / 950) * 1.25 : 0.85;

    setZoom(Math.max(0.7, Math.min(targetZoom, 1.4)));
    setPan({
      x: viewCenterX - centerX * targetZoom,
      y: viewCenterY - centerY * targetZoom
    });
  }, []);

  useEffect(() => {
    recenter(false);
    const handleResize = () => recenter(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [recenter]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    setPan({
      x: dragStartRef.current.panX + dx,
      y: dragStartRef.current.panY + dy
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      const touch = e.touches[0];
      dragStartRef.current = { x: touch.clientX, y: touch.clientY, panX: pan.x, panY: pan.y };
    } else if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && isDragging) {
      const touch = e.touches[0];
      const dx = touch.clientX - dragStartRef.current.x;
      const dy = touch.clientY - dragStartRef.current.y;
      setPan({
        x: dragStartRef.current.panX + dx,
        y: dragStartRef.current.panY + dy
      });
    } else if (e.touches.length === 2 && touchStartDistRef.current != null) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const factor = dist / touchStartDistRef.current;
      setZoom((prev) => Math.max(MIN_ZOOM, Math.min(prev * factor, MAX_ZOOM)));
      touchStartDistRef.current = dist;
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    touchStartDistRef.current = null;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => Math.max(MIN_ZOOM, Math.min(prev * factor, MAX_ZOOM)));
  };

  const panToPoint = (px: number, py: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const isTablet = rect.width >= 768;
    const targetViewX = isTablet ? (rect.width + 380) / 2 : rect.width / 2;
    const targetViewY = isTablet ? rect.height / 2 : (rect.height - 180) / 2;
    setPan({
      x: targetViewX - px * zoom,
      y: targetViewY - py * zoom
    });
  };

  const canZoomIn = zoom < MAX_ZOOM - 0.005;
  const canZoomOut = zoom > MIN_ZOOM + 0.005;

  const handleZoomIn = () => {
    if (!canZoomIn) return;
    setZoom((z) => Math.min(z * 1.25, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    if (!canZoomOut) return;
    setZoom((z) => Math.max(z * 0.8, MIN_ZOOM));
  };

  return {
    containerRef,
    zoom,
    pan,
    isDragging,
    canZoomIn,
    canZoomOut,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleWheel,
    handleZoomIn,
    handleZoomOut,
    panToPoint,
    recenter
  };
}
