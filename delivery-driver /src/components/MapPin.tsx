import React from 'react';
import { Stop } from '../state/routeContext';

interface MapPinProps {
  stop: Stop;
  isSelected?: boolean;
  onSelect?: (stopId: number) => void;
}

export const MapPin: React.FC<MapPinProps> = ({ stop, isSelected = false, onSelect }) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(stop.id);
    }
  };

  const { status, stopNumber, x, y } = stop;

  if (status === 'completed') {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        onClick={handleClick}
        className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
        role="button"
        aria-label={`Stop ${stopNumber}: ${stop.name} (Completed)`}
      >
        {/* Pin Drop Shape */}
        <path
          d="M0,0 C-12,-12 -14,-22 -14,-28 C-14,-36 -7,-42 0,-42 C7,-42 14,-36 14,-28 C14,-22 12,-12 0,0 Z"
          fill="#10B981"
        />
        {/* Inner circle */}
        <circle cx="0" cy="-28" fill="#ffffff" r="8" />
        {/* Checkmark */}
        <path
          d="M-4,-28 L-1,-25 L4,-31"
          fill="none"
          stroke="#10B981"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2.5"
        />
        {/* Label Badge */}
        <rect
          fill="#ffffff"
          height="16"
          rx="4"
          stroke="#c2c6d8"
          strokeWidth="1"
          width="46"
          x="18"
          y="-36"
        />
        <text
          fill="#10B981"
          fontFamily="Inter, sans-serif"
          fontSize="10"
          fontWeight="600"
          textAnchor="middle"
          x="41"
          y="-24"
        >
          Stop {stopNumber}
        </text>
      </g>
    );
  }

  if (status === 'in_progress') {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        onClick={handleClick}
        className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
        role="button"
        aria-label={`Stop ${stopNumber}: ${stop.name} (In Progress)`}
      >
        {/* Pulsing Halo Circle */}
        <circle
          className="halo-pulse"
          cx="0"
          cy="-30"
          fill="url(#haloGlow)"
          r="32"
        />
        {/* Drop Pin Body */}
        <path
          d="M0,0 C-14,-14 -16,-24 -16,-31 C-16,-40 -9,-47 0,-47 C9,-47 16,-40 16,-31 C16,-24 14,-14 0,0 Z"
          fill="#0066FF"
        />
        {/* Inner White Dot */}
        <circle cx="0" cy="-31" fill="#ffffff" r="10" />
        {/* Text number */}
        <text
          fill="#0066FF"
          fontFamily="Inter, sans-serif"
          fontSize="12"
          fontWeight="700"
          textAnchor="middle"
          x="0"
          y="-27"
        >
          {stopNumber}
        </text>
        {/* Floating Destination Badge */}
        <g transform="translate(0, -60)">
          <rect
            fill="#0050cb"
            height="20"
            rx="10"
            width="88"
            x="-44"
            y="0"
          />
          <text
            fill="#ffffff"
            fontFamily="Inter, sans-serif"
            fontSize="10"
            fontWeight="700"
            textAnchor="middle"
            x="0"
            y="14"
          >
            CURRENT STOP
          </text>
        </g>
      </g>
    );
  }

  // Attention status
  if (status === 'attention') {
    return (
      <g
        transform={`translate(${x}, ${y})`}
        onClick={handleClick}
        className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
        role="button"
        aria-label={`Stop ${stopNumber}: ${stop.name} (Attention)`}
      >
        <circle
          cx="0"
          cy="0"
          fill="#ffffff"
          r="15"
          stroke="#EF4444"
          strokeWidth="2.5"
        />
        <circle cx="0" cy="0" fill="#EF4444" r="11" />
        <text
          fill="#ffffff"
          fontFamily="Inter, sans-serif"
          fontSize="11"
          fontWeight="700"
          textAnchor="middle"
          x="0"
          y="4"
        >
          {stopNumber}
        </text>
        {isSelected && (
          <circle
            cx="0"
            cy="0"
            fill="none"
            r="19"
            stroke="#EF4444"
            strokeWidth="2"
            strokeDasharray="3 3"
          />
        )}
      </g>
    );
  }

  // Pending status
  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={handleClick}
      className="cursor-pointer transition-transform hover:scale-110 active:scale-95"
      role="button"
      aria-label={`Stop ${stopNumber}: ${stop.name} (Pending)`}
    >
      <circle
        cx="0"
        cy="0"
        fill="#ffffff"
        r="14"
        stroke={isSelected ? '#0066FF' : '#9CA3AF'}
        strokeWidth={isSelected ? '2.5' : '2'}
      />
      <circle
        cx="0"
        cy="0"
        fill={isSelected ? '#0066FF' : '#9CA3AF'}
        r="10"
      />
      <text
        fill="#ffffff"
        fontFamily="Inter, sans-serif"
        fontSize="11"
        fontWeight="600"
        textAnchor="middle"
        x="0"
        y="4"
      >
        {stopNumber}
      </text>
      {isSelected && (
        <circle
          cx="0"
          cy="0"
          fill="none"
          r="18"
          stroke="#0066FF"
          strokeWidth="2"
          strokeDasharray="3 2"
        />
      )}
    </g>
  );
};
