// app/src/components/screens/MapNavigation.tsx - Screen 5: Dedicated Full-Screen Map Navigation

import React, { useState, useEffect, useMemo } from 'react';
import { useStore } from '../../state/store';
import { TopBar } from '../shared/TopBar';
import { SignalIndicator } from '../shared/SignalIndicator';
import { SwipeBar } from '../shared/SwipeBar';
import { RoutePill } from '../RoutePill';
import { RecenterButton } from '../RecenterButton';
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

  const [hasEntered, setHasEntered] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    track('N01');
    const timer = setTimeout(() => setHasEntered(true), 50);
    return () => clearTimeout(timer);
  }, [track]);

  useEffect(() => {
    if (conditions.driverNearNextOutlet) {
      track('N06');
    }
  }, [conditions.driverNearNextOutlet, track]);

  if (!selectedRoute) return null;

  const outlets = selectedRoute.outlets;

  // Selected outlet on map: defaults to selectedMapOutletId or upNextOutlet or outlets[0]
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

  // Coordinate projections for SVG viewport (390 x 500)
  const svgWidth = 390;
  const svgHeight = 500;
  const padding = 44;

  const points = useMemo(() => {
    if (outlets.length === 0) return [];
    const lats = outlets.map((o) => o.lat);
    const lngs = outlets.map((o) => o.lng);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats) || minLat + 0.1;
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs) || minLng + 0.1;

    return outlets.map((o, idx) => {
      // Scale coordinates to SVG canvas
      const x = padding + ((o.lng - minLng) / (maxLng - minLng)) * (svgWidth - padding * 2);
      const y = padding + (1 - (o.lat - minLat) / (maxLat - minLat)) * (svgHeight - padding * 2);
      return { id: o.id, x, y, outlet: o, index: idx + 1 };
    });
  }, [outlets]);

  // Driver coordinates (near target outlet or point 0)
  const driverPoint = useMemo(() => {
    const target = points.find((p) => p.id === currentMapOutlet.id) || points[0];
    if (isArrived && target) {
      return { x: target.x - 10, y: target.y + 12 };
    }
    return target ? { x: target.x - 26, y: target.y + 32 } : { x: 195, y: 240 };
  }, [points, currentMapOutlet, isArrived]);

  // Calculate driver heading cone angle pointing towards active outlet
  const driverAngleDeg = useMemo(() => {
    const target = points.find((p) => p.id === currentMapOutlet.id);
    if (!target) return -45;
    const dy = target.y - driverPoint.y;
    const dx = target.x - driverPoint.x;
    return (Math.atan2(dy, dx) * 180) / Math.PI;
  }, [points, currentMapOutlet, driverPoint]);

  // Authentic Sri Lankan central route turn-by-turn guidance generator
  const currentManeuver = useMemo(() => {
    if (isArrived) {
      return {
        icon: 'check_circle',
        distanceText: '10 m',
        instruction: `Arrived at ${currentMapOutlet.city}`,
        subInstruction: 'Park in designated commercial delivery bay',
        nextStep: 'Prepare crates for receiver verification',
        etaMinutes: 0,
        distanceKm: 0.1
      };
    }

    const cityGuidance: Record<
      string,
      { icon: string; distanceText: string; instruction: string; subInstruction: string; nextStep: string; etaMinutes: number; distanceKm: number }
    > = {
      Peradeniya: {
        icon: 'turn_left',
        distanceText: '350 m',
        instruction: 'Turn left onto Peradeniya Rd / A1',
        subInstruction: 'In 350 m, keep left toward Royal Botanical Gardens',
        nextStep: 'Then 1.4 km straight along A1 corridor',
        etaMinutes: 6,
        distanceKm: 2.8
      },
      Katugastota: {
        icon: 'turn_right',
        distanceText: '500 m',
        instruction: 'Turn right onto Kurunegala Rd across Katugastota Bridge',
        subInstruction: 'In 500 m, bear right at the bridge approach',
        nextStep: 'Then follow Kurunegala Rd / A10 for 2.1 km',
        etaMinutes: 9,
        distanceKm: 4.1
      },
      Gampola: {
        icon: 'straight',
        distanceText: '750 m',
        instruction: 'Continue straight on Kandy - Gampola Hwy / AB13',
        subInstruction: 'In 750 m, proceed through roundabout second exit',
        nextStep: 'Then stay on AB13 south toward Gampola clock tower',
        etaMinutes: 14,
        distanceKm: 8.6
      },
      Kundasale: {
        icon: 'turn_slight_right',
        distanceText: '250 m',
        instruction: 'Bear right onto Digana - Kandy Rd / A26',
        subInstruction: 'In 250 m, merge right onto provincial highway',
        nextStep: 'Then 3.2 km past Pallekele International Stadium',
        etaMinutes: 11,
        distanceKm: 5.4
      }
    };

    return (
      cityGuidance[currentMapOutlet.city] || {
        icon: 'turn_right',
        distanceText: '350 m',
        instruction: `Turn right onto William Gopallawa Mawatha toward ${currentMapOutlet.city}`,
        subInstruction: `In 350 m, take the exit toward ${currentMapOutlet.city}`,
        nextStep: `Then follow A1 toward ${currentMapOutlet.city} for 1.8 km`,
        etaMinutes: 8,
        distanceKm: 3.2
      }
    );
  }, [currentMapOutlet, isArrived]);

  const handlePinTap = (outlet: Outlet, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedMapOutletId(outlet.id);
    track('N02');
    if (outlet.status === 'completed') {
      track('N08');
    }
  };

  const handleCanvasTap = () => {
    setSelectedMapOutletId(null);
    track('N03');
  };

  const handleRecenter = () => {
    setSelectedMapOutletId(null);
    track('N06');
    showToast('Map centered to route bounds');
  };

  const handleDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    track('N04');
    setIsNavigating(true);
    showToast(`Starting navigation to ${currentMapOutlet.city}`);
  };

  const handleStopDirections = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsNavigating(false);
  };

  const handleExternalMaps = (e: React.MouseEvent) => {
    e.stopPropagation();
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

  const handleTurnOnGps = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsLocating(true);
    track('N07');
    setTimeout(() => {
      setIsLocating(false);
      updateCondition('gpsStatus', 'on');
    }, 600);
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
    <div className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none">
      {/* 1. TopBar (44px, "Fleet Logistics" centered, Back chevron on the left, solid page background, no hairline) */}
      <TopBar
        title="Fleet Logistics"
        showBackButton={true}
        onBack={popScreen}
        isScrolled={false}
      />

      {/* 2. Map Area (Full-bleed schematic canvas) */}
      <div
        onClick={handleCanvasTap}
        className="flex-1 relative w-full overflow-hidden bg-bg select-none"
      >
        {/* 3a/b. Top Overlay: Either In-App Turn-by-Turn Banner OR RoutePill + Recenter */}
        {isNavigating ? (
          <div className="absolute top-3 left-3 right-3 z-30 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="w-full bg-surface/90 backdrop-blur-xl rounded-[20px] border border-hairline/80 p-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.08)] dark:shadow-none select-none">
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  {/* Apple Maneuver Icon Badge */}
                  <div
                    className={`w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 ${
                      isArrived ? 'bg-success/15 text-success-text' : 'bg-action/10 text-action'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[26px]">
                      {currentManeuver.icon}
                    </span>
                  </div>

                  {/* Distance & Turn Instruction */}
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="text-[20px] font-bold text-text-primary tracking-tight font-mono tabular-nums leading-none">
                        {currentManeuver.distanceText}
                      </span>
                      <span
                        className={`text-[11px] font-semibold uppercase tracking-wider ${
                          isArrived ? 'text-success-text' : 'text-action'
                        }`}
                      >
                        {isArrived ? 'Arriving' : 'Next Turn'}
                      </span>
                    </div>
                    <p className="text-[13px] text-text-primary font-medium leading-tight mt-1 line-clamp-1">
                      {currentManeuver.instruction}
                    </p>
                  </div>
                </div>

                {/* Minimal Dismiss / Exit Button */}
                <button
                  type="button"
                  onClick={handleStopDirections}
                  aria-label="Exit in-app navigation"
                  className="w-8 h-8 rounded-full bg-hairline/50 hover:bg-hairline text-text-secondary hover:text-text-primary flex items-center justify-center transition-colors cursor-pointer shrink-0 mt-0.5 active:scale-95"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              {/* Secondary Upcoming Maneuver Preview */}
              {!isArrived && (
                <div className="mt-2.5 pt-2 border-t border-hairline/60 flex items-center justify-between text-[11px] text-text-secondary">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="material-symbols-outlined text-[14px] text-text-secondary/70 shrink-0">
                      straight
                    </span>
                    <span className="truncate">{currentManeuver.nextStep}</span>
                  </div>
                  <span className="font-mono tabular-nums text-text-secondary/80 shrink-0 ml-2">
                    {currentManeuver.etaMinutes} min
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* 3a. Route Pill (Top-Left, 12px from edges, 32px tall, surface fill, hairline) */}
            <RoutePill
              routeNumber={selectedRoute.routeNumber}
              distanceKm={selectedRoute.distanceKm}
              className="absolute top-3 left-3 z-20"
            />

            {/* 3b. Recenter Button (Top-Right, 12px from edges, 44px round, surface fill, hairline, fit route glyph) */}
            <RecenterButton
              onRecenter={handleRecenter}
              className="absolute top-3 right-3 z-20"
            />
          </>
        )}

        {/* SVG Route Map */}
        <svg
          className="w-full h-full absolute inset-0 pointer-events-auto"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Driver flashlight/heading cone gradient */}
            <radialGradient id="driver-cone-grad" cx="50%" cy="100%" r="100%" fx="50%" fy="100%">
              <stop offset="0%" stopColor="var(--action)" stopOpacity="0.32" />
              <stop offset="60%" stopColor="var(--action)" stopOpacity="0.12" />
              <stop offset="100%" stopColor="var(--action)" stopOpacity="0" />
            </radialGradient>

            {/* Soft shadow for pins */}
            <filter id="apple-pin-shadow" x="-30%" y="-30%" width="160%" height="160%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.16" />
            </filter>
          </defs>

          {/* Minimal Scenic Geography (Apple Maps calm aesthetic) */}
          {/* Hanthana mountain range outline */}
          <path
            d="M 25,65 Q 85,50 115,85 Q 125,120 75,135 Q 25,115 25,65 Z"
            fill="var(--success)"
            fillOpacity="0.035"
            stroke="none"
          />

          {/* Kandy Lake water feature */}
          <path
            d="M 185,215 Q 225,195 245,225 Q 260,255 220,265 Q 185,260 175,235 Z"
            fill="var(--action)"
            fillOpacity="0.06"
            stroke="var(--action)"
            strokeWidth="0.8"
            strokeOpacity="0.15"
          />
          <text
            x="215"
            y="243"
            textAnchor="middle"
            fill="var(--action)"
            fillOpacity="0.32"
            fontSize="8.5"
            fontFamily="-apple-system, BlinkMacSystemFont, sans-serif"
            fontWeight="500"
            letterSpacing="0.06em"
          >
            KANDY LAKE
          </text>

          {/* Apple-style clean road network background (subtle arterial curves) */}
          <g stroke="var(--hairline)" strokeLinecap="round" strokeLinejoin="round" fill="none">
            {/* Major Arterial Highways (wider, softly muted) */}
            <g strokeWidth="3.2" strokeOpacity="0.32">
              <path d="M -20,80 Q 120,60 220,120 T 410,100" />
              <path d="M 30,-20 Q 80,140 110,260 T 140,520" />
              <path d="M 280,-10 Q 250,150 290,290 T 260,510" />
              <path d="M -10,320 Q 130,290 260,350 T 410,310" />
            </g>
            {/* Secondary Arterials */}
            <g strokeWidth="1.6" strokeOpacity="0.22">
              <path d="M -10,180 Q 90,210 200,170 T 400,220" />
              <path d="M -20,420 Q 140,450 250,400 T 400,440" />
              <path d="M 180,-10 Q 200,180 180,320 T 210,510" />
              <path d="M 340,30 Q 300,190 350,330 T 320,510" />
            </g>
          </g>

          {/* Route Polylines joining outlets in visit order:
              - When in navigation mode:
                - Active leg towards currentMapOutlet is drawn bold with animated dashed pulse
                - Inactive legs are softly dimmed to 20% opacity
              - When not in navigation mode:
                - Standard clean visit sequence polylines
          */}
          {points.map((pt, i) => {
            if (i === 0) return null;
            const prev = points[i - 1];
            const isSegmentDone = pt.outlet.status === 'completed';
            const isActiveLeg = isNavigating && pt.id === currentMapOutlet.id;

            return (
              <g key={`leg-${pt.id}`}>
                {/* Base Polyline */}
                <line
                  x1={prev.x}
                  y1={prev.y}
                  x2={pt.x}
                  y2={pt.y}
                  stroke={isSegmentDone ? 'var(--text-secondary)' : 'var(--action)'}
                  strokeWidth={isActiveLeg ? 5.5 : 3.2}
                  strokeOpacity={
                    isNavigating
                      ? isActiveLeg
                        ? 0.95
                        : 0.2
                      : isSegmentDone
                      ? 0.45
                      : 0.9
                  }
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Animated Directional Dash for Active Navigating Leg */}
                {isActiveLeg && (
                  <line
                    x1={prev.x}
                    y1={prev.y}
                    x2={pt.x}
                    y2={pt.y}
                    stroke="#ffffff"
                    strokeWidth="2.5"
                    strokeDasharray="6 8"
                    strokeOpacity="0.85"
                    strokeLinecap="round"
                    className="animate-nav-flow"
                  />
                )}
              </g>
            );
          })}

          {/* Active Navigation direct line from driver to target outlet if GPS on */}
          {conditions.gpsStatus === 'on' && (
            <g>
              <line
                x1={driverPoint.x}
                y1={driverPoint.y}
                x2={points.find((p) => p.id === currentMapOutlet.id)?.x || driverPoint.x}
                y2={points.find((p) => p.id === currentMapOutlet.id)?.y || driverPoint.y}
                stroke="var(--action)"
                strokeWidth={isNavigating ? 3 : 2}
                strokeDasharray={isNavigating ? '5 5' : '6 6'}
                strokeOpacity={isNavigating ? 0.8 : 0.5}
                className={isNavigating ? 'animate-nav-flow' : ''}
              />
            </g>
          )}

          {/* Driver Location Puck with Apple-style Directional Cone */}
          {conditions.gpsStatus === 'on' && (
            <g transform={`translate(${driverPoint.x}, ${driverPoint.y})`}>
              {/* Heading flashlight cone in direction of target outlet */}
              <path
                d="M 0 0 L -16 -40 A 44 44 0 0 1 16 -40 Z"
                fill="url(#driver-cone-grad)"
                transform={`rotate(${driverAngleDeg + 90})`}
                pointerEvents="none"
              />

              {/* Accuracy circle: accent at 12% fill, >= 24px across */}
              <circle r="20" fill="var(--action)" fillOpacity="0.14" />

              {/* 3px surface ring + 16px accent dot */}
              <circle
                r="8"
                fill="var(--action)"
                stroke="var(--surface)"
                strokeWidth="3"
                filter="url(#apple-pin-shadow)"
              />
            </g>
          )}

          {/* Outlet Pins:
              - completed: emerald fill (#00C46A) with white checkmark
              - in progress: accent fill, white number, soft pulsing ring
              - pending: surface fill, 2px ring in secondary text color, number in primary text
              - selected / navigating: scale 1.15 plus accent aura ring
          */}
          {points.map((pt) => {
            const isSelected = currentMapOutlet.id === pt.id;
            const isDone = pt.outlet.status === 'completed';
            const isInProgress = pt.outlet.status === 'in_progress';
            const isNavTarget = isNavigating && isSelected;

            return (
              <g
                key={pt.id}
                onClick={(e) => handlePinTap(pt.outlet, e as any)}
                aria-label={`Outlet ${pt.index}, ${pt.outlet.city}, ${pt.outlet.status}`}
                className="cursor-pointer"
                style={{
                  transform: `translate(${pt.x}px, ${pt.y}px) scale(${isSelected ? 1.15 : 1})`,
                  transformOrigin: `${pt.x}px ${pt.y}px`,
                  transition: 'transform 150ms ease-out'
                }}
              >
                {/* 44px transparent hit area */}
                <circle r="22" fill="transparent" />

                {/* Pulsing Beacon Ring for active navigation target */}
                {isNavTarget && (
                  <circle
                    r="24"
                    fill="none"
                    stroke="var(--action)"
                    strokeWidth="2.5"
                    strokeOpacity="0.45"
                    className="animate-ping"
                  />
                )}

                {/* Accent ring for selected pin */}
                {isSelected && !isNavTarget && (
                  <circle
                    r="19"
                    fill="none"
                    stroke="var(--action)"
                    strokeWidth="3"
                    strokeOpacity="0.30"
                  />
                )}

                {/* Pulsing ring on in-progress pin */}
                {isInProgress && !isDone && !isNavTarget && (
                  <circle
                    r="19"
                    fill="none"
                    stroke="var(--action)"
                    strokeWidth="2"
                    strokeOpacity="0.4"
                    className="animate-ping"
                  />
                )}

                {/* 32px Pin Body */}
                <circle
                  r="16"
                  fill={isDone ? '#00C46A' : isInProgress || isNavTarget ? 'var(--action)' : 'var(--surface)'}
                  stroke={isDone ? '#00C46A' : isInProgress || isNavTarget ? 'var(--action)' : 'var(--text-secondary)'}
                  strokeWidth="2"
                  filter="url(#apple-pin-shadow)"
                />

                {/* Pin Glyph */}
                {isDone ? (
                  <path
                    d="M -4 -0.5 L -1 2.5 L 4.5 -3"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <text
                    textAnchor="middle"
                    dy="4.5"
                    fill={isInProgress || isNavTarget ? '#ffffff' : 'var(--text-primary)'}
                    fontSize="13"
                    fontWeight="700"
                    fontFamily="JetBrains Mono, monospace"
                  >
                    {pt.index}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Attribution: 10px, secondary text, positioned above bottom card */}
        <div className="absolute bottom-52 right-3 z-10 pointer-events-none">
          <span className="text-[10px] text-secondary/80 select-none">
            © OpenStreetMap contributors
          </span>
        </div>

        {/* 3c. Bottom Area: Floating In-App Navigation Card OR Outlet Card OR Finish Bar */}
        <div className="absolute bottom-4 left-4 right-4 z-30">
          {allOutletsCompleted ? (
            /* FINISH BAR: only when ALL outlets are completed */
            <div className="w-full bg-surface rounded-[16px] border border-hairline p-2 shadow-xl animate-row-enter">
              <SwipeBar
                selectedRouteNumber={selectedRoute.routeNumber}
                isReadyOverride={true}
                readyText={`Swipe to finish Route ${selectedRoute.routeNumber}`}
                onComplete={handleFinishRoute}
              />
            </div>
          ) : isNavigating ? (
            /* IN-APP DIRECTIONS ACTIVE CARD (Apple Maps Minimal Simplicity) */
            <div
              role="status"
              aria-live="polite"
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-[20px] bg-surface/95 backdrop-blur-xl border border-hairline p-4 shadow-[0_8px_32px_rgba(0,0,0,0.08)] dark:shadow-none select-none animate-row-enter"
            >
              {/* Row 1: ETA & Fastest Route Badge */}
              <div className="flex items-baseline justify-between">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[26px] font-bold text-text-primary tracking-tight font-mono tabular-nums leading-none">
                    {isArrived ? 'Arrived' : currentManeuver.etaMinutes}
                  </span>
                  {!isArrived && (
                    <span className="text-[14px] font-medium text-text-secondary leading-none">
                      min
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success/10 text-success-text text-[11px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  <span>Fastest route</span>
                </div>
              </div>

              {/* Row 2: Distance & Destination Details */}
              <div className="flex items-center justify-between text-[13px] text-text-secondary mt-1 font-mono tabular-nums">
                <span>
                  {isArrived
                    ? '0.0 km remaining'
                    : `≈ ${currentManeuver.distanceKm} km · 09:42 arrival`}
                </span>
                <span className="text-text-primary font-sans font-medium truncate max-w-[150px]">
                  {currentMapOutlet.city}
                </span>
              </div>

              {/* Row 3: Action Buttons (48px tall, 12px radius) */}
              <div className="grid grid-cols-2 gap-3 mt-3.5 pt-1">
                {/* End Route / Stop Directions */}
                <button
                  type="button"
                  onClick={handleStopDirections}
                  className="h-12 rounded-[12px] border border-hairline bg-surface hover:bg-hairline/25 text-text-primary font-medium text-[15px] flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                  <span>End Route</span>
                </button>

                {/* Arrived / Open / Resume Outlet */}
                <button
                  type="button"
                  onClick={handleOpenOutlet}
                  className="h-12 rounded-[12px] bg-action text-white font-semibold text-[15px] flex items-center justify-center gap-1 shadow-sm hover:opacity-95 transition-all cursor-pointer active:scale-[0.98]"
                >
                  <span>{isArrived ? "I've Arrived" : isInProgressOutlet ? 'Resume' : 'Open'}</span>
                  <span className="material-symbols-outlined text-[18px]">chevron_right</span>
                </button>
              </div>

              {/* Row 4: Subtle fallback to external Google Maps */}
              <div className="mt-2.5 pt-2 border-t border-hairline/50 flex justify-center">
                <button
                  type="button"
                  onClick={handleExternalMaps}
                  className="text-[11px] text-text-secondary hover:text-action flex items-center gap-1 font-medium transition-colors cursor-pointer"
                >
                  <span>Open in external maps</span>
                  <span className="material-symbols-outlined text-[12px]">open_in_new</span>
                </button>
              </div>
            </div>
          ) : (
            /* OUTLET CARD (Default): 16px from sides, 16px radius, surface fill, hairline */
            <div
              role="status"
              aria-live="polite"
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-[16px] bg-surface border border-hairline p-4 shadow-[0_4px_20px_rgba(0,0,0,0.06)] dark:shadow-none select-none transition-opacity duration-150 animate-row-enter"
            >
              {/* Row 1: Label & Distance */}
              <div className="flex items-center justify-between min-h-[18px]">
                <div className="flex items-center gap-1.5">
                  {isArrived && (
                    <span className="w-2 h-2 rounded-full bg-success shrink-0" />
                  )}
                  <span
                    className={`text-[13px] font-medium leading-none ${
                      isArrived ? 'text-success-text' : 'text-secondary'
                    }`}
                  >
                    {isArrived
                      ? "You've arrived"
                      : currentMapOutlet.id === upNextOutlet?.id
                      ? 'Up next'
                      : `Outlet ${currentMapOutlet.visitOrder} of ${outlets.length}`}
                  </span>
                </div>

                {conditions.gpsStatus === 'on' && (
                  <span className="text-[13px] font-mono tabular-nums text-secondary leading-none">
                    {isArrived ? '≈ 80 m away' : '≈ 1.2 km away'}
                  </span>
                )}
              </div>

              {/* Row 2: City */}
              <h2 className="text-[22px] font-semibold text-black dark:text-white tracking-tight leading-snug mt-1 truncate">
                {currentMapOutlet.city}
              </h2>

              {/* Row 3: Status dot plus text */}
              <div className="flex items-center gap-1.5 mt-0.5 min-h-[20px]">
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isCompletedOutlet
                      ? 'bg-success'
                      : isInProgressOutlet
                      ? 'bg-action'
                      : 'bg-pending'
                  }`}
                />
                <span className="text-[14px] text-secondary font-normal">
                  {isCompletedOutlet
                    ? `Completed · ${currentMapOutlet.completedAt || '06:52'}`
                    : isInProgressOutlet
                    ? `${currentMapOutlet.itemCount} items · In progress`
                    : `${currentMapOutlet.itemCount} items · Pending`}
                </span>
              </div>

              {/* GPS status helper line if GPS is off */}
              {conditions.gpsStatus === 'off' && !isCompletedOutlet && (
                <div className="mt-2 text-[13px] text-secondary flex items-center gap-1.5">
                  <span>Turn on GPS to see your position.</span>
                  <button
                    type="button"
                    onClick={handleTurnOnGps}
                    className="text-[13px] font-medium text-action hover:underline focus:outline-none cursor-pointer"
                  >
                    {isLocating ? 'Locating…' : 'Turn on'}
                  </button>
                </div>
              )}

              {/* SignalIndicator inside card if weak or offline */}
              {isSignalDegraded && (
                <div className="mt-2 pt-1 border-t border-hairline">
                  <SignalIndicator
                    networkStatus={conditions.networkStatus}
                    gpsStatus={conditions.gpsStatus}
                    gpsQuality={conditions.gpsQuality}
                    showHelperAlways={true}
                  />
                </div>
              )}

              {/* Row 4: Two equal buttons (48px tall, 8px radius, 12px apart) */}
              {!isCompletedOutlet && (
                <div className="grid grid-cols-2 gap-3 mt-3.5 pt-1">
                  {/* Directions Button - Enters In-App Apple Guidance */}
                  <button
                    type="button"
                    onClick={handleDirections}
                    className={`h-12 rounded-[8px] text-[15px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      isArrived
                        ? 'border border-hairline bg-surface text-black dark:text-white hover:bg-hairline/20'
                        : 'bg-action text-white shadow-sm hover:opacity-95'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[18px]">navigation</span>
                    <span>Directions</span>
                  </button>

                  {/* Open / Resume Button */}
                  <button
                    type="button"
                    onClick={handleOpenOutlet}
                    className={`h-12 rounded-[8px] text-[15px] font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                      isArrived
                        ? 'bg-action text-white shadow-sm hover:opacity-95'
                        : 'border border-hairline bg-surface text-black dark:text-white hover:bg-hairline/20'
                    }`}
                  >
                    <span>{isInProgressOutlet ? 'Resume' : 'Open'}</span>
                    <span className="material-symbols-outlined text-[18px]">chevron_right</span>
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
