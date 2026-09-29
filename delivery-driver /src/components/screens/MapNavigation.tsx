// app/src/components/screens/MapNavigation.tsx - Apple Maps-Style Self-Contained Vector Map Navigation

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useStore } from '../../state/store';
import { TopBar } from '../shared/TopBar';
import { SignalIndicator } from '../shared/SignalIndicator';
import { RoutePill } from '../RoutePill';
import { Outlet } from '../../data/mock';

export const MapNavigation: React.FC = () => {
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

  const containerRef = useRef<HTMLDivElement>(null);

  // Pan & Zoom state for interactive vector map
  const MIN_ZOOM = 0.6;
  const MAX_ZOOM = 2.5;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const touchStartDistRef = useRef<number | null>(null);

  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    track('N01');
  }, [track]);

  if (!selectedRoute) return null;

  const outlets = selectedRoute.outlets;

  // Selected outlet on map
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

  // Map coordinate bounds
  const mapBounds = useMemo(() => {
    if (outlets.length === 0) return { minLat: 7.15, maxLat: 7.35, minLng: 80.5, maxLng: 80.75 };
    const lats = outlets.map((o) => o.lat);
    const lngs = outlets.map((o) => o.lng);
    return {
      minLat: Math.min(...lats) - 0.03,
      maxLat: Math.max(...lats) + 0.03,
      minLng: Math.min(...lngs) - 0.03,
      maxLng: Math.max(...lngs) + 0.03
    };
  }, [outlets]);

  // World canvas dimensions
  const WORLD_WIDTH = 1200;
  const WORLD_HEIGHT = 900;

  // Project lat/lng to world coordinates
  const project = useCallback(
    (lat: number, lng: number) => {
      const x = ((lng - mapBounds.minLng) / (mapBounds.maxLng - mapBounds.minLng)) * WORLD_WIDTH;
      const y = (1 - (lat - mapBounds.minLat) / (mapBounds.maxLat - mapBounds.minLat)) * WORLD_HEIGHT;
      return { x, y };
    },
    [mapBounds]
  );

  // Projected outlet points
  const projectedOutlets = useMemo(() => {
    return outlets.map((o) => {
      const { x, y } = project(o.lat, o.lng);
      return { ...o, px: x, py: y };
    });
  }, [outlets, project]);

  // Active target projected point
  const currentTargetPoint = useMemo(() => {
    return projectedOutlets.find((p) => p.id === currentMapOutlet.id) || projectedOutlets[0];
  }, [projectedOutlets, currentMapOutlet]);

  // Simulated driver coordinates
  const driverPoint = useMemo(() => {
    if (!currentTargetPoint) return { x: 500, y: 450 };
    if (isArrived) {
      return { x: currentTargetPoint.px - 14, y: currentTargetPoint.py + 16 };
    }
    return { x: currentTargetPoint.px - 48, y: currentTargetPoint.py + 52 };
  }, [currentTargetPoint, isArrived]);

  // Completed count
  const completedCount = useMemo(() => {
    return outlets.filter((o) => o.status === 'completed').length;
  }, [outlets]);

  // Initial recenter calculation
  const recenter = useCallback(
    (animate = true) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const isTablet = rect.width >= 768;

      // Desired center in world coordinates
      const centerX = WORLD_WIDTH / 2;
      const centerY = WORLD_HEIGHT / 2;

      // Viewport center, offset to the right if tablet panel is present
      const viewCenterX = isTablet ? (rect.width + 380) / 2 : rect.width / 2;
      const viewCenterY = isTablet ? rect.height / 2 : (rect.height - 180) / 2;

      const targetZoom = isTablet ? Math.min(rect.width / 1300, rect.height / 950) * 1.25 : 0.85;

      setZoom(Math.max(0.7, Math.min(targetZoom, 1.4)));
      setPan({
        x: viewCenterX - centerX * targetZoom,
        y: viewCenterY - centerY * targetZoom
      });
    },
    [WORLD_WIDTH, WORLD_HEIGHT]
  );

  useEffect(() => {
    recenter(false);
    const handleResize = () => recenter(false);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [recenter]);

  // Pan & Drag Handlers
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

  // Touch Handlers for Tablet & Mobile Pinch / Pan
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

  // Wheel Zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => Math.max(MIN_ZOOM, Math.min(prev * factor, MAX_ZOOM)));
  };

  // Actions
  const handlePinTap = (outlet: Outlet, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedMapOutletId(outlet.id);
    track('N02');

    // Pan gently to clicked pin
    if (containerRef.current) {
      const pt = projectedOutlets.find((p) => p.id === outlet.id);
      if (pt) {
        const rect = containerRef.current.getBoundingClientRect();
        const isTablet = rect.width >= 768;
        const targetViewX = isTablet ? (rect.width + 380) / 2 : rect.width / 2;
        const targetViewY = isTablet ? rect.height / 2 : (rect.height - 180) / 2;
        setPan({
          x: targetViewX - pt.px * zoom,
          y: targetViewY - pt.py * zoom
        });
      }
    }
  };

  const handleRecenterClick = () => {
    setSelectedMapOutletId(null);
    track('N06');
    recenter(true);
    showToast('Map centered to full route');
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

  const handleTurnOnGps = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsLocating(true);
    track('N07');
    setTimeout(() => {
      setIsLocating(false);
      updateCondition('gpsStatus', 'on');
      showToast('GPS active · high precision tracking');
    }, 500);
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

  const handleFinishRoute = () => {
    track('N09');
    replaceScreen('shift_summary');
  };

  const isSignalDegraded =
    conditions.networkStatus === 'weak' ||
    conditions.networkStatus === 'offline' ||
    conditions.gpsStatus === 'off' ||
    conditions.gpsQuality === 'weak';

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-bg select-none">
      {/* 1. TopBar (44px) */}
      <div className="w-full shrink-0 z-20">
        <TopBar
          title="Fleet Logistics"
          showBackButton={true}
          onBack={popScreen}
          isScrolled={false}
        />
      </div>

      {/* 2. Interactive Vector Map Canvas */}
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
        {/* Geographic Vector Plane */}
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
          <svg
            width={WORLD_WIDTH}
            height={WORLD_HEIGHT}
            viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
            className="w-full h-full block"
          >
            <defs>
              {/* Forest / Nature Area Gradient */}
              <linearGradient id="parkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d5ecd4" stopOpacity="0.75" />
                <stop offset="100%" stopColor="#c3e4c1" stopOpacity="0.85" />
              </linearGradient>

              {/* Water River / Lake Gradient */}
              <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#bce0f8" />
                <stop offset="100%" stopColor="#a3d2f5" />
              </linearGradient>

              {/* Dark mode park gradient */}
              <linearGradient id="parkGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#122c26" />
                <stop offset="100%" stopColor="#0a201c" />
              </linearGradient>

              {/* Route line shadow */}
              <filter id="routeShadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.25" floodColor="#0047FF" />
              </filter>
            </defs>

            {/* Apple Maps Terrain Shapes: Green Conservation Zones */}
            <path
              d="M 120,40 Q 280,30 360,110 T 320,240 T 140,220 Z"
              className="fill-[#e1eedd] dark:fill-[#0c2420] transition-colors"
            />
            <path
              d="M 850,80 Q 1050,60 1140,160 T 1060,380 T 820,300 Z"
              className="fill-[#e1eedd] dark:fill-[#0c2420] transition-colors"
            />
            <path
              d="M 680,560 Q 900,480 1060,620 T 960,840 T 720,780 Z"
              className="fill-[#e1eedd] dark:fill-[#0c2420] transition-colors"
            />
            <path
              d="M 80,620 Q 220,540 320,680 T 260,860 T 60,820 Z"
              className="fill-[#e1eedd] dark:fill-[#0c2420] transition-colors"
            />

            {/* Geographic Water Bodies: Mahaweli River Path */}
            <path
              d="M -20,280 Q 220,240 380,340 T 620,260 T 840,420 T 1060,390 T 1240,480"
              fill="none"
              stroke="#bce0f8"
              strokeWidth="28"
              strokeLinecap="round"
              className="stroke-[#bce0f8] dark:stroke-[#0e304b] transition-colors"
            />

            {/* Kandy Lake */}
            <ellipse
              cx="540"
              cy="480"
              rx="64"
              ry="38"
              className="fill-[#aed8f7] dark:fill-[#0e3556] transition-colors"
            />
            <text
              x="540"
              y="484"
              textAnchor="middle"
              className="fill-[#457b9d] dark:fill-[#79a9cc] text-[11px] font-semibold tracking-wider uppercase select-none opacity-80"
            >
              Kandy Lake
            </text>

            {/* Secondary Water Reservoirs */}
            <path
              d="M 940,380 Q 990,340 1020,390 T 970,440 Z"
              className="fill-[#aed8f7] dark:fill-[#0e3556] transition-colors"
            />
            <text
              x="1000"
              y="410"
              textAnchor="middle"
              className="fill-[#457b9d] dark:fill-[#79a9cc] text-[10px] font-medium tracking-wide uppercase select-none opacity-70"
            >
              Victoria Reservoir
            </text>

            {/* Secondary Road Network (Muted Grey / Slate) */}
            <g className="stroke-[#d8e2ec] dark:stroke-[#182348] transition-colors" strokeWidth="3" fill="none">
              <path d="M 0,160 Q 300,140 600,190 T 1200,140" />
              <path d="M 0,380 Q 320,420 620,360 T 1200,410" />
              <path d="M 0,620 Q 340,580 660,660 T 1200,600" />
              <path d="M 0,780 Q 300,820 640,760 T 1200,800" />

              <path d="M 220,0 Q 200,300 240,600 T 210,900" />
              <path d="M 440,0 Q 480,300 450,600 T 470,900" />
              <path d="M 760,0 Q 730,300 780,600 T 750,900" />
              <path d="M 980,0 Q 1020,300 970,600 T 1000,900" />
            </g>

            {/* Arterial Highways (Warm Pale Cream / Dark Slate) */}
            <g className="stroke-[#f8fafc] dark:stroke-[#243366] transition-colors" strokeWidth="6" strokeLinecap="round" fill="none">
              <path d="M 120,0 Q 240,240 460,400 T 740,540 T 1120,720" />
              <path d="M 0,540 Q 280,480 560,460 T 920,480 T 1200,440" />
              <path d="M 520,0 Q 540,280 560,560 T 540,900" />
            </g>

            {/* Highway Route Numbers / Shields */}
            <g className="select-none font-mono text-[10px] font-bold">
              <rect x="260" y="270" width="28" height="16" rx="4" className="fill-white dark:fill-[#1e2750] stroke-slate-300 dark:stroke-slate-600" />
              <text x="274" y="282" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300">A1</text>

              <rect x="760" y="550" width="28" height="16" rx="4" className="fill-white dark:fill-[#1e2750] stroke-slate-300 dark:stroke-slate-600" />
              <text x="774" y="562" textAnchor="middle" className="fill-slate-600 dark:fill-slate-300">A9</text>
            </g>

            {/* 3. Delivery Route Line: Polyline connecting all stops */}
            {projectedOutlets.map((pt, i) => {
              if (i === 0) return null;
              const prev = projectedOutlets[i - 1];
              const isSegmentDone = pt.status === 'completed';

              return (
                <g key={`segment-${pt.id}`}>
                  {/* White casing for crisp road contrast */}
                  <line
                    x1={prev.px}
                    y1={prev.py}
                    x2={pt.px}
                    y2={pt.py}
                    stroke="#ffffff"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.85"
                  />
                  {/* Core Cobalt Delivery Path */}
                  <line
                    x1={prev.px}
                    y1={prev.py}
                    x2={pt.px}
                    y2={pt.py}
                    stroke={isSegmentDone ? '#8A91AB' : '#0047FF'}
                    strokeWidth="4.5"
                    strokeOpacity={isSegmentDone ? 0.45 : 0.95}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </g>
              );
            })}

            {/* 4. Dashed line from driver to current target stop */}
            {conditions.gpsStatus === 'on' && currentTargetPoint && (
              <line
                x1={driverPoint.x}
                y1={driverPoint.y}
                x2={currentTargetPoint.px}
                y2={currentTargetPoint.py}
                stroke="#0047FF"
                strokeWidth="2.5"
                strokeDasharray="6,6"
                strokeOpacity="0.75"
              />
            )}

            {/* 5. Driver Telemetry Dot */}
            {conditions.gpsStatus === 'on' && (
              <g transform={`translate(${driverPoint.x}, ${driverPoint.y})`}>
                <circle r="36" fill="#0047FF" fillOpacity="0.14" />
                <circle r="18" fill="#0047FF" fillOpacity="0.25" />
                <circle r="8.5" fill="#0047FF" stroke="#FFFFFF" strokeWidth="3" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
              </g>
            )}

            {/* 6. Stop Markers (Apple Maps-style numbered circles) */}
            {projectedOutlets.map((pt) => {
              const isSelected = currentMapOutlet.id === pt.id;
              const isDone = pt.status === 'completed';
              const isInProgress = pt.status === 'in_progress';

              return (
                <g
                  key={pt.id}
                  onClick={(e) => handlePinTap(pt, e)}
                  className="cursor-pointer"
                  style={{
                    transform: `translate(${pt.px}px, ${pt.py}px) scale(${isSelected ? 1.18 : 1})`,
                    transformOrigin: `${pt.px}px ${pt.py}px`,
                    transition: 'transform 180ms cubic-bezier(0.2, 0, 0, 1)'
                  }}
                >
                  {/* 48px touch hit area */}
                  <circle r="24" fill="transparent" />

                  {/* Pulsing ring for in-progress stop */}
                  {isInProgress && !isDone && (
                    <circle r="22" fill="none" stroke="#0047FF" strokeWidth="2" strokeOpacity="0.5" className="animate-ping" />
                  )}

                  {/* Selected Stop Outer Halo */}
                  {isSelected && (
                    <circle r="21" fill="none" stroke="#0047FF" strokeWidth="4" strokeOpacity="0.3" />
                  )}

                  {/* 32px Pin Body */}
                  <circle
                    r="16"
                    fill={isDone ? '#00C46A' : isInProgress ? '#0047FF' : 'var(--surface)'}
                    stroke={isDone ? '#00C46A' : isInProgress ? '#0047FF' : '#5B6480'}
                    strokeWidth="2"
                    filter="drop-shadow(0 3px 6px rgba(0,0,0,0.18))"
                  />

                  {/* Glyph: Checkmark for done, number for active/pending */}
                  {isDone ? (
                    <path
                      d="M -4 -0.5 L -1 2.5 L 4.5 -3"
                      fill="none"
                      stroke="#FFFFFF"
                      strokeWidth="2.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  ) : (
                    <text
                      textAnchor="middle"
                      dy="4.5"
                      fill={isInProgress ? '#FFFFFF' : 'var(--text-primary)'}
                      fontSize="12.5"
                      fontWeight="700"
                      fontFamily="JetBrains Mono, monospace"
                      className="select-none"
                    >
                      {pt.visitOrder}
                    </text>
                  )}

                  {/* Outlet City Label underneath pin */}
                  <text
                    textAnchor="middle"
                    y="27"
                    className="fill-black dark:fill-white text-[11px] font-semibold select-none drop-shadow-sm pointer-events-none"
                  >
                    {pt.city}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Floating Route Pill on Mobile/Portrait */}
        <div className="md:hidden absolute top-3 left-3 z-10 pointer-events-auto">
          <RoutePill
            routeNumber={selectedRoute.routeNumber}
            distanceKm={selectedRoute.distanceKm}
          />
        </div>

        {/* 3. Floating Apple Maps Controls (Top-Right) */}
        <div className="absolute top-4 right-4 z-20 flex flex-col gap-2.5 pointer-events-auto">
          {/* Zoom Group */}
          <div className="bg-surface/90 dark:bg-[#141D45]/95 backdrop-blur-md border border-hairline rounded-2xl shadow-lg flex flex-col overflow-hidden">
            <button
              type="button"
              onClick={handleZoomIn}
              disabled={!canZoomIn}
              aria-label="Zoom in"
              className={`w-11 h-11 flex items-center justify-center border-b border-hairline/50 focus:outline-none transition-all ${
                !canZoomIn
                  ? 'cursor-not-allowed'
                  : 'text-text-primary hover:bg-hairline/20 active:scale-95 cursor-pointer'
              }`}
            >
              <span
                style={!canZoomIn ? { filter: 'blur(1.5px)' } : undefined}
                className={`material-symbols-outlined text-[20px] transition-all select-none ${
                  !canZoomIn ? 'blur-[1.5px] opacity-35 text-secondary' : 'text-text-primary'
                }`}
              >
                add
              </span>
            </button>
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={!canZoomOut}
              aria-label="Zoom out"
              className={`w-11 h-11 flex items-center justify-center focus:outline-none transition-all ${
                !canZoomOut
                  ? 'cursor-not-allowed'
                  : 'text-text-primary hover:bg-hairline/20 active:scale-95 cursor-pointer'
              }`}
            >
              <span
                style={!canZoomOut ? { filter: 'blur(1.5px)' } : undefined}
                className={`material-symbols-outlined text-[20px] transition-all select-none ${
                  !canZoomOut ? 'blur-[1.5px] opacity-35 text-secondary' : 'text-text-primary'
                }`}
              >
                remove
              </span>
            </button>
          </div>

          {/* Recenter & Fit Route Button */}
          <button
            type="button"
            onClick={handleRecenterClick}
            aria-label="Fit entire route on map"
            className="w-11 h-11 rounded-2xl bg-surface/90 dark:bg-[#141D45]/95 backdrop-blur-md border border-hairline shadow-lg flex items-center justify-center text-text-primary hover:bg-hairline/20 active:scale-95 transition-transform cursor-pointer focus:outline-none"
          >
            <span className="material-symbols-outlined text-[20px]">crop_free</span>
          </button>

          {/* GPS Toggle */}
          <button
            type="button"
            onClick={() => handleTurnOnGps()}
            aria-label={conditions.gpsStatus === 'on' ? 'GPS is active' : 'Turn on GPS'}
            className={`w-11 h-11 rounded-2xl border shadow-lg flex items-center justify-center transition-all cursor-pointer focus:outline-none ${
              conditions.gpsStatus === 'on'
                ? 'bg-action text-white border-action'
                : 'bg-surface/90 dark:bg-[#141D45]/95 backdrop-blur-md border-hairline text-text-secondary hover:bg-hairline/20'
            }`}
          >
            <span className={`material-symbols-outlined text-[20px] ${isLocating ? 'animate-spin' : ''}`}>
              {conditions.gpsStatus === 'on' ? 'near_me' : 'location_searching'}
            </span>
          </button>
        </div>

        {/* 4. Tablet Landscape Floating Side Panel (380px wide on >= 768px, iPad Style) */}
        <div className="hidden md:flex absolute top-4 left-4 bottom-4 w-[380px] z-20 pointer-events-auto flex-col">
          <div className="w-full h-full bg-surface/95 dark:bg-[#141D45]/95 backdrop-blur-xl border border-hairline rounded-[24px] shadow-2xl flex flex-col overflow-hidden">
            {/* Tablet Header */}
            <div className="p-4 pb-3 border-b border-hairline flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={popScreen}
                  aria-label="Back to dashboard"
                  className="w-9 h-9 rounded-full bg-surface border border-hairline flex items-center justify-center text-text-primary hover:bg-hairline/20 active:scale-95 transition-transform cursor-pointer focus:outline-none"
                >
                  <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                </button>
                <div>
                  <h1 className="text-[17px] font-bold text-black dark:text-white leading-tight">
                    Route {selectedRoute.routeNumber}
                  </h1>
                  <p className="text-[12px] font-medium text-secondary">
                    {completedCount} of {outlets.length} stops completed · {selectedRoute.distanceKm} km
                  </p>
                </div>
              </div>

              <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
                allOutletsCompleted ? 'bg-success/15 text-success' : 'bg-action/10 text-action'
              }`}>
                {allOutletsCompleted ? 'Complete' : 'Live Run'}
              </span>
            </div>

            {/* Degraded signal alert banner */}
            {isSignalDegraded && (
              <div className="px-4 py-2 border-b border-hairline bg-attention/10 text-attention flex items-center gap-2">
                <SignalIndicator
                  networkStatus={conditions.networkStatus}
                  gpsStatus={conditions.gpsStatus}
                  gpsQuality={conditions.gpsQuality}
                  showHelperAlways={false}
                />
              </div>
            )}

            {/* Tablet Body: Active Stop Details or Completion Celebration */}
            {allOutletsCompleted ? (
              /* NO SWIPE BAR: Clean Apple-style primary finish button */
              <div className="p-5 flex-1 flex flex-col justify-center items-center text-center">
                <div className="w-16 h-16 rounded-full bg-success/15 text-success flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-[34px]">task_alt</span>
                </div>
                <h2 className="text-[20px] font-bold text-black dark:text-white">All Stops Delivered!</h2>
                <p className="text-[14px] text-secondary mt-1 mb-6 max-w-[280px]">
                  All {outlets.length} outlets on Route {selectedRoute.routeNumber} have been completed and verified.
                </p>

                <button
                  type="button"
                  onClick={handleFinishRoute}
                  className="w-full h-14 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-semibold text-[16px] flex items-center justify-center shadow-lg transition-all cursor-pointer focus:outline-none"
                >
                  <span>Finish Route & Review Summary</span>
                  <span className="material-symbols-outlined ml-1.5 text-[20px]">arrow_forward</span>
                </button>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto flex flex-col">
                {/* Active Stop Detail Card */}
                <div className="p-4 bg-surface/60 border-b border-hairline">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[12px] font-semibold text-action uppercase tracking-wide">
                      {isArrived ? "At Dock" : currentMapOutlet.id === upNextOutlet?.id ? 'Up Next' : `Stop ${currentMapOutlet.visitOrder} of ${outlets.length}`}
                    </span>
                    <span className="text-[12px] font-mono tabular-nums text-secondary font-medium">
                      {isArrived ? '≈ 80 m away' : '≈ 1.2 km away'}
                    </span>
                  </div>

                  <h2 className="text-[20px] font-bold text-black dark:text-white tracking-tight">
                    {currentMapOutlet.city}
                  </h2>

                  <div className="flex items-center gap-2 mt-1 text-[13px] text-secondary">
                    <span>{currentMapOutlet.itemCount} packages</span>
                    <span>•</span>
                    <span>Nuwan Perera</span>
                    <a
                      href={`tel:${currentMapOutlet.managerPhone}`}
                      className="ml-auto inline-flex items-center gap-1 text-action hover:underline text-[12px] font-semibold"
                    >
                      <span className="material-symbols-outlined text-[14px]">call</span>
                      <span>Call</span>
                    </a>
                  </div>

                  {/* Primary Dual Actions (NO SWIPE BAR) */}
                  {!isCompletedOutlet && (
                    <div className="grid grid-cols-2 gap-2.5 mt-3.5">
                      <button
                        type="button"
                        onClick={handleDirections}
                        className="h-12 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1.5 border border-hairline bg-surface text-black dark:text-white hover:bg-hairline/20 active:scale-95 transition-all cursor-pointer focus:outline-none"
                      >
                        <span className="material-symbols-outlined text-[18px]">navigation</span>
                        <span>Directions</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenOutlet}
                        className="h-12 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1 bg-action hover:bg-action/90 active:scale-95 text-white shadow-sm transition-all cursor-pointer focus:outline-none"
                      >
                        <span>{isInProgressOutlet ? 'Resume' : 'Open Delivery'}</span>
                        <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Stops Sequence List */}
                <div className="flex-1 overflow-y-auto p-2">
                  <div className="px-3 py-1.5 text-[11px] font-semibold text-secondary uppercase tracking-wider">
                    Full Route Sequence ({outlets.length} Stops)
                  </div>
                  <div className="space-y-1">
                    {outlets.map((o) => {
                      const isSel = o.id === currentMapOutlet.id;
                      const isDone = o.status === 'completed';
                      const isInProg = o.status === 'in_progress';

                      return (
                        <div
                          key={o.id}
                          onClick={() => handlePinTap(o)}
                          className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-colors ${
                            isSel
                              ? 'bg-action/10 border border-action/30'
                              : 'hover:bg-hairline/20 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[12px] font-bold shrink-0 ${
                              isDone
                                ? 'bg-success text-white'
                                : isInProg
                                ? 'bg-action text-white'
                                : 'bg-surface border border-hairline text-secondary'
                            }`}>
                              {isDone ? '✓' : o.visitOrder}
                            </span>
                            <span className="text-[14px] font-medium text-black dark:text-white truncate">
                              {o.city}
                            </span>
                          </div>

                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                            isDone
                              ? 'bg-success/15 text-success'
                              : isInProg
                              ? 'bg-action/15 text-action'
                              : 'bg-hairline/30 text-secondary'
                          }`}>
                            {isDone ? 'Done' : isInProg ? 'Active' : `${o.itemCount} pkgs`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 5. Mobile & Tablet Portrait Bottom Card (NO SWIPE BAR) */}
        <div className="md:hidden absolute bottom-3 left-3 right-3 z-30 pointer-events-auto">
          {allOutletsCompleted ? (
            /* FINISH CARD: direct Apple-style button */
            <div className="w-full bg-surface border border-hairline rounded-[20px] p-4 shadow-2xl flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-1 text-success font-semibold text-[15px]">
                <span className="material-symbols-outlined text-[20px]">task_alt</span>
                <span>All {outlets.length} Stops Delivered</span>
              </div>
              <p className="text-[13px] text-secondary mb-3">Route {selectedRoute.routeNumber} complete</p>

              <button
                type="button"
                onClick={handleFinishRoute}
                className="w-full h-12 bg-action hover:bg-action/90 active:scale-[0.99] text-white rounded-xl font-semibold text-[15px] flex items-center justify-center shadow-md transition-all cursor-pointer focus:outline-none"
              >
                <span>Finish Route</span>
                <span className="material-symbols-outlined ml-1.5 text-[18px]">arrow_forward</span>
              </button>
            </div>
          ) : (
            /* ACTIVE OUTLET CARD */
            <div className="w-full bg-surface border border-hairline rounded-[20px] p-3.5 shadow-2xl select-none">
              <div className="flex items-center justify-between min-h-[18px]">
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    isCompletedOutlet ? 'bg-success' : isInProgressOutlet ? 'bg-action' : 'bg-pending'
                  }`} />
                  <span className="text-[13px] font-semibold text-secondary">
                    {isArrived
                      ? "You've arrived"
                      : currentMapOutlet.id === upNextOutlet?.id
                      ? 'Up next'
                      : `Stop ${currentMapOutlet.visitOrder} of ${outlets.length}`}
                  </span>
                </div>

                <span className="text-[13px] font-mono tabular-nums text-secondary font-medium">
                  {isArrived ? '≈ 80 m away' : '≈ 1.2 km away'}
                </span>
              </div>

              <h2 className="text-[20px] font-bold text-black dark:text-white tracking-tight mt-0.5 truncate">
                {currentMapOutlet.city}
              </h2>

              <div className="flex items-center gap-2 mt-0.5 text-[13px] text-secondary">
                <span>{currentMapOutlet.itemCount} items</span>
                <span>•</span>
                <span>Nuwan Perera</span>
                <a
                  href={`tel:${currentMapOutlet.managerPhone}`}
                  className="ml-auto inline-flex items-center gap-1 text-action hover:underline text-[12px] font-semibold"
                >
                  <span className="material-symbols-outlined text-[14px]">call</span>
                  <span>Call</span>
                </a>
              </div>

              {conditions.gpsStatus === 'off' && !isCompletedOutlet && (
                <div className="mt-2 text-[12px] text-secondary flex items-center justify-between">
                  <span>GPS is off</span>
                  <button
                    type="button"
                    onClick={() => handleTurnOnGps()}
                    className="font-semibold text-action cursor-pointer hover:underline"
                  >
                    Enable
                  </button>
                </div>
              )}

              {/* Primary Dual Actions (NO SWIPE BAR) */}
              {!isCompletedOutlet && (
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <button
                    type="button"
                    onClick={handleDirections}
                    className="h-11 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1 border border-hairline bg-surface text-black dark:text-white hover:bg-hairline/20 active:scale-95 transition-all cursor-pointer focus:outline-none"
                  >
                    <span className="material-symbols-outlined text-[17px]">navigation</span>
                    <span>Directions</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenOutlet}
                    className="h-11 rounded-xl text-[14px] font-semibold flex items-center justify-center gap-1 bg-action hover:bg-action/90 active:scale-95 text-white shadow-sm transition-all cursor-pointer focus:outline-none"
                  >
                    <span>{isInProgressOutlet ? 'Resume' : 'Open'}</span>
                    <span className="material-symbols-outlined text-[17px]">chevron_right</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
