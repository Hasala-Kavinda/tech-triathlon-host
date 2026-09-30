// src/features/map-navigation/components/MapNavigationScreen.tsx - Map Navigation Main Screen

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useStore } from '@/state/store';
import { TopBar, RoutePill } from '@/shared/components/ui';
import { isDemoMode } from '@/shared/lib/demo';
import { Outlet } from '@/shared/types';
import { computeMapBounds, projectCoordinate, ProjectedOutlet, WORLD_WIDTH, WORLD_HEIGHT } from '../utils/mapProjection';
import { useMapGestures } from '../hooks/useMapGestures';
import { VectorMapCanvas } from './VectorMapCanvas';
import { MapNavigationControls } from './MapNavigationControls';
import { MapBottomSheet } from './MapBottomSheet';

export const MapNavigationScreen: React.FC = () => {
  const {
    selectedRoute,
    activeOutletId,
    setActiveOutletId,
    selectedMapOutletId,
    setSelectedMapOutletId,
    upNextOutlet,
    allOutletsCompleted,
    pushScreen,
    popScreen,
    replaceScreen,
    setReturnTo,
    conditions,
    updateCondition,
    showToast,
    track
  } = useStore();

  const [isLocating, setIsLocating] = useState(false);
  const {
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
  } = useMapGestures();

  useEffect(() => {
    track('N01');
  }, [track]);

  const outlets = selectedRoute?.outlets || [];

  const currentMapOutlet: Outlet = useMemo(() => {
    if (selectedMapOutletId) {
      const found = outlets.find((o) => o.id === selectedMapOutletId);
      if (found) return found;
    }
    return upNextOutlet || outlets[0];
  }, [selectedMapOutletId, outlets, upNextOutlet]);

  const isCompletedOutlet = currentMapOutlet.status === 'completed';
  const isInProgressOutlet = currentMapOutlet.status === 'in_progress';
  const isArrived = conditions.driverNearNextOutlet && !isCompletedOutlet;

  const mapBounds = useMemo(() => computeMapBounds(outlets), [outlets]);

  const project = useCallback(
    (lat: number, lng: number) => projectCoordinate(lat, lng, mapBounds),
    [mapBounds]
  );

  const projectedOutlets: ProjectedOutlet[] = useMemo(() => {
    return outlets.map((o) => {
      const { x, y } = project(o.lat, o.lng);
      return { ...o, px: x, py: y };
    });
  }, [outlets, project]);

  const currentTargetPoint = useMemo(() => {
    return projectedOutlets.find((p) => p.id === currentMapOutlet.id) || projectedOutlets[0];
  }, [projectedOutlets, currentMapOutlet]);

  const driverPoint = useMemo(() => {
    if (!currentTargetPoint) return { x: 500, y: 450 };
    if (isArrived) {
      return { x: currentTargetPoint.px - 14, y: currentTargetPoint.py + 16 };
    }
    return { x: currentTargetPoint.px - 48, y: currentTargetPoint.py + 52 };
  }, [currentTargetPoint, isArrived]);

  const completedCount = useMemo(() => {
    return outlets.filter((o) => o.status === 'completed').length;
  }, [outlets]);

  if (!selectedRoute) return null;

  const handlePinTap = (outlet: Outlet, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMapOutletId(outlet.id);
    track('N02');
    const pt = projectedOutlets.find((p) => p.id === outlet.id);
    if (pt) panToPoint(pt.px, pt.py);
  };

  const handleRecenterClick = () => {
    setSelectedMapOutletId(null);
    track('N06');
    recenter(true);
    showToast('Map centered to full route');
  };

  const handleTurnOnGps = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsLocating(true);
    track('N07');

    if (isDemoMode() || typeof navigator === 'undefined' || !navigator.geolocation) {
      setTimeout(() => {
        setIsLocating(false);
        updateCondition('gpsStatus', 'on');
        showToast('GPS active · location locked');
      }, 500);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setIsLocating(false);
        updateCondition('gpsStatus', 'on');
        showToast('GPS active · location locked');
      },
      (err) => {
        setIsLocating(false);
        if (err.code === err.PERMISSION_DENIED) {
          updateCondition('gpsStatus', 'blocked');
          showToast('Location permission denied');
        } else {
          updateCondition('gpsStatus', 'unavailable');
          showToast('GPS signal searching');
        }
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    track('N04');
    if (currentMapOutlet.lat != null && currentMapOutlet.lng != null) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${currentMapOutlet.lat},${currentMapOutlet.lng}&travelmode=driving`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOpenOutlet = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveOutletId(currentMapOutlet.id);
    setReturnTo('map');
    track('N05');
    if (currentMapOutlet.unpackingComplete) {
      pushScreen('pin_confirmation');
    } else {
      pushScreen('market_detail');
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-bg select-none">
      <div className="w-full shrink-0 z-20">
        <TopBar
          title="Fleet Logistics"
          showBackButton={true}
          onBack={popScreen}
          isScrolled={false}
        />
      </div>

      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        className={`flex-1 w-full h-full relative overflow-hidden bg-[#eef3f7] dark:bg-[#0B1437] ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: WORLD_WIDTH,
            height: WORLD_HEIGHT,
            transition: isDragging ? 'none' : 'transform 200ms cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          className="absolute inset-0 pointer-events-auto select-none"
        >
          <VectorMapCanvas
            projectedOutlets={projectedOutlets}
            currentMapOutlet={currentMapOutlet}
            currentTargetPoint={currentTargetPoint}
            driverPoint={driverPoint}
            conditions={conditions}
            onPinTap={handlePinTap}
          />
        </div>

        <div className="md:hidden absolute top-3 left-3 z-10 pointer-events-auto">
          <RoutePill
            routeNumber={selectedRoute.routeNumber}
            distanceKm={selectedRoute.distanceKm}
          />
        </div>

        <MapNavigationControls
          canZoomIn={canZoomIn}
          canZoomOut={canZoomOut}
          isLocating={isLocating}
          conditions={conditions}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onRecenter={handleRecenterClick}
          onTurnOnGps={handleTurnOnGps}
        />

        <MapBottomSheet
          selectedRoute={selectedRoute}
          outlets={outlets}
          currentMapOutlet={currentMapOutlet}
          upNextOutlet={upNextOutlet}
          allOutletsCompleted={allOutletsCompleted}
          isCompletedOutlet={isCompletedOutlet}
          isInProgressOutlet={isInProgressOutlet}
          isArrived={isArrived}
          conditions={conditions}
          completedCount={completedCount}
          onPopScreen={popScreen}
          onPinTap={handlePinTap}
          onDirections={handleDirections}
          onOpenOutlet={handleOpenOutlet}
          onFinishRoute={() => {
            track('N09');
            replaceScreen('shift_summary');
          }}
          onTurnOnGps={handleTurnOnGps}
        />
      </div>
    </div>
  );
};
