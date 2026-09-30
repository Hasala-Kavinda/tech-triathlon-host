// src/features/map-navigation/components/VectorMapCanvas.tsx - SVG Vector map terrain and markers

import React from 'react';
import { Outlet, PrototypeConditions } from '@/shared/types';
import { WORLD_WIDTH, WORLD_HEIGHT, ProjectedOutlet } from '../utils/mapProjection';

export interface VectorMapCanvasProps {
  projectedOutlets: ProjectedOutlet[];
  currentMapOutlet: Outlet;
  currentTargetPoint: ProjectedOutlet;
  driverPoint: { x: number; y: number };
  conditions: PrototypeConditions;
  onPinTap: (outlet: Outlet, e?: React.MouseEvent) => void;
}

export const VectorMapCanvas: React.FC<VectorMapCanvasProps> = ({
  projectedOutlets,
  currentMapOutlet,
  currentTargetPoint,
  driverPoint,
  conditions,
  onPinTap
}) => {
  return (
    <svg
      width={WORLD_WIDTH}
      height={WORLD_HEIGHT}
      viewBox={`0 0 ${WORLD_WIDTH} ${WORLD_HEIGHT}`}
      className="w-full h-full block"
    >
      <defs>
        <linearGradient id="parkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d5ecd4" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#c3e4c1" stopOpacity="0.85" />
        </linearGradient>

        <linearGradient id="waterGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#bce0f8" />
          <stop offset="100%" stopColor="#a3d2f5" />
        </linearGradient>

        <linearGradient id="parkGradDark" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#122c26" />
          <stop offset="100%" stopColor="#0a201c" />
        </linearGradient>

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

      {/* Water Bodies: Mahaweli River Path */}
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

      {/* Secondary Road Network */}
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

      {/* Arterial Highways */}
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

      {/* Delivery Route Polyline */}
      {projectedOutlets.map((pt, i) => {
        if (i === 0) return null;
        const prev = projectedOutlets[i - 1];
        const isSegmentDone = pt.status === 'completed';

        return (
          <g key={`segment-${pt.id}`}>
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

      {/* Dashed line to current target stop */}
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

      {/* Driver Telemetry Dot */}
      {conditions.gpsStatus === 'on' && (
        <g transform={`translate(${driverPoint.x}, ${driverPoint.y})`}>
          <circle r="36" fill="#0047FF" fillOpacity="0.14" />
          <circle r="18" fill="#0047FF" fillOpacity="0.25" />
          <circle r="8.5" fill="#0047FF" stroke="#FFFFFF" strokeWidth="3" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.3))" />
        </g>
      )}

      {/* Stop Markers */}
      {projectedOutlets.map((pt) => {
        const isSelected = currentMapOutlet.id === pt.id;
        const isDone = pt.status === 'completed';
        const isInProgress = pt.status === 'in_progress';

        return (
          <g
            key={pt.id}
            onClick={(e) => onPinTap(pt, e)}
            className="cursor-pointer"
            style={{
              transform: `translate(${pt.px}px, ${pt.py}px) scale(${isSelected ? 1.18 : 1})`,
              transformOrigin: `${pt.px}px ${pt.py}px`,
              transition: 'transform 180ms cubic-bezier(0.2, 0, 0, 1)'
            }}
          >
            <circle r="24" fill="transparent" />

            {isInProgress && !isDone && (
              <circle r="22" fill="none" stroke="#0047FF" strokeWidth="2" strokeOpacity="0.5" className="animate-ping" />
            )}

            {isSelected && (
              <circle r="21" fill="none" stroke="#0047FF" strokeWidth="4" strokeOpacity="0.3" />
            )}

            <circle
              r="16"
              fill={isDone ? '#00C46A' : isInProgress ? '#0047FF' : 'var(--surface)'}
              stroke={isDone ? '#00C46A' : isInProgress ? '#0047FF' : '#5B6480'}
              strokeWidth="2"
              filter="drop-shadow(0 3px 6px rgba(0,0,0,0.18))"
            />

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
  );
};
