import React, { useState } from 'react';
import { useRoute, Stop } from '../state/routeContext';

export interface TodayAssignmentsProps {
  overrideState?: 'populated' | 'loading' | 'long' | 'empty';
  customStops?: Stop[];
}

// 10 mock stops for the long list state
const mockLongStops: Stop[] = [
  {
    id: 1,
    stopNumber: 1,
    name: 'Metro Fresh Market',
    address: 'Downtown · Bay 4',
    dock: 'Bay 4',
    managerName: 'M. Rodriguez',
    managerPhone: '555-0199',
    verifiedPin: '8841',
    status: 'completed',
    x: 60,
    y: 460,
    products: Array(8).fill({ id: '1', name: 'Product', qty: '1', checked: true })
  },
  {
    id: 2,
    stopNumber: 2,
    name: 'Whole Foods Market',
    address: 'Grand Ave · Dock B',
    dock: 'Bay 4',
    managerName: 'E. Rostova',
    managerPhone: '555-0142',
    verifiedPin: '4821',
    status: 'in_progress',
    x: 220,
    y: 230,
    products: Array(7).fill({ id: '2', name: 'Product', qty: '1', checked: false })
  },
  {
    id: 3,
    stopNumber: 3,
    name: 'Cornerstone Bodega & Deli',
    address: 'Oak St · Counter',
    dock: 'Front',
    managerName: 'A. Tariq',
    managerPhone: '555-0188',
    verifiedPin: '1229',
    status: 'pending',
    x: 310,
    y: 170,
    products: Array(6).fill({ id: '3', name: 'Product', qty: '1', checked: false })
  },
  {
    id: 4,
    stopNumber: 4,
    name: 'Northside Organic Grocers',
    address: 'Pine Blvd · North Gate',
    dock: 'Refrigerated Cart',
    managerName: 'D. Miller',
    managerPhone: '555-0133',
    verifiedPin: '3319',
    status: 'pending',
    x: 310,
    y: 90,
    products: Array(9).fill({ id: '4', name: 'Product', qty: '1', checked: false })
  },
  {
    id: 5,
    stopNumber: 5,
    name: 'Sunset Supermarket',
    address: 'West End · Bay 1',
    dock: 'Bay 1',
    managerName: 'S. Jenkins',
    managerPhone: '555-0177',
    verifiedPin: '9842',
    status: 'pending',
    x: 220,
    y: 90,
    products: Array(11).fill({ id: '5', name: 'Product', qty: '1', checked: false })
  },
  {
    id: 6,
    stopNumber: 6,
    name: 'Beacon Hill Mart',
    address: 'Beacon St · Side Dock',
    dock: 'Side Loading',
    managerName: 'K. Patel',
    managerPhone: '555-0155',
    verifiedPin: '6721',
    status: 'pending',
    x: 140,
    y: 50,
    products: Array(8).fill({ id: '6', name: 'Product', qty: '1', checked: false })
  },
  {
    id: 7,
    stopNumber: 7,
    name: 'Midtown Cafe & Pantry',
    address: 'Midtown · Suite 104',
    dock: 'Alley',
    managerName: 'C. Zhao',
    managerPhone: '555-0166',
    verifiedPin: '2941',
    status: 'pending',
    x: 180,
    y: 120,
    products: Array(5).fill({ id: '7', name: 'Product', qty: '1', checked: false })
  },
  {
    id: 8,
    stopNumber: 8,
    name: 'Riverfront Market',
    address: 'Harbor Way · Pier 9',
    dock: 'Pier 9',
    managerName: 'L. Moreno',
    managerPhone: '555-0174',
    verifiedPin: '5192',
    status: 'pending',
    x: 260,
    y: 310,
    products: Array(6).fill({ id: '8', name: 'Product', qty: '1', checked: false })
  },
  {
    id: 9,
    stopNumber: 9,
    name: 'Highland Specialty Foods',
    address: 'Highland Ave · Bay A',
    dock: 'Bay A',
    managerName: 'T. Brooks',
    managerPhone: '555-0182',
    verifiedPin: '7394',
    status: 'pending',
    x: 290,
    y: 400,
    products: Array(4).fill({ id: '9', name: 'Product', qty: '1', checked: false })
  },
  {
    id: 10,
    stopNumber: 10,
    name: 'Eastside Organic Hub',
    address: 'Commercial St · Depot 2',
    dock: 'Depot 2',
    managerName: 'R. Chen',
    managerPhone: '555-0193',
    verifiedPin: '8215',
    status: 'pending',
    x: 340,
    y: 430,
    products: Array(7).fill({ id: '10', name: 'Product', qty: '1', checked: false })
  }
];

export const TodayAssignments: React.FC<TodayAssignmentsProps> = ({
  overrideState,
  customStops
}) => {
  const { stops: contextStops } = useRoute();
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine current active state and stop list
  const state = overrideState || 'populated';

  let displayStops: Stop[] = [];
  if (state === 'empty') {
    displayStops = [];
  } else if (state === 'long') {
    displayStops = mockLongStops;
  } else if (state === 'populated') {
    // 6 stops for populated view
    displayStops = customStops || (contextStops && contextStops.length >= 6 ? contextStops.slice(0, 6) : mockLongStops.slice(0, 6));
  } else {
    // fallback / default
    displayStops = customStops || contextStops.slice(0, 6);
  }

  // Format today's date (e.g., "Monday, Sep 28")
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });

  // Calculate metrics
  const totalStopsCount = displayStops.length;
  const totalItemsCount = displayStops.reduce((acc, s) => acc + (s.products?.length || 0), 0);

  // Approximate shift time (45 mins per stop + 30 min buffer)
  const totalMinutes = totalStopsCount > 0 ? totalStopsCount * 45 + 30 : 0;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const timeFormatted = totalStopsCount > 0 ? `${hours}h ${mins > 0 ? `${mins}m` : ''}` : '0m';

  // Visible stops for long list
  const isLong = totalStopsCount > 5;
  const visibleStops = isLong && !isExpanded ? displayStops.slice(0, 5) : displayStops;

  const getStatusColor = (status: Stop['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-[#10B981]'; // Green
      case 'in_progress':
        return 'bg-[#0066FF]'; // Blue (app accent)
      case 'attention':
        return 'bg-[#0066FF]';
      case 'pending':
      default:
        return 'bg-[#9CA3AF]'; // Gray
    }
  };

  // Helper to extract a concise area name from address
  const getAreaLabel = (address: string) => {
    if (!address) return 'Local Route';
    const parts = address.split(',');
    return parts[0].trim();
  };

  return (
    <section
      aria-label="Today's Assignments"
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", Inter, sans-serif'
      }}
      className="w-full bg-surface-container-lowest dark:bg-[#1c1c1e] rounded-[20px] border border-outline-variant/30 dark:border-white/10 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none transition-all duration-300"
    >
      {/* 1. Header row */}
      <div className="flex items-baseline justify-between">
        <h2 className="text-[22px] font-semibold tracking-tight text-on-surface leading-none">
          Today
        </h2>
        <span className="text-[15px] opacity-60 text-on-surface tabular-nums font-normal">
          {dateStr}
        </span>
      </div>

      {/* 2. Summary line */}
      <div className="mt-1.5 text-[15px] opacity-60 text-on-surface tabular-nums font-normal leading-normal">
        {state === 'loading' ? (
          <div className="h-4 w-44 bg-on-surface/10 rounded animate-pulse" />
        ) : (
          `${totalStopsCount} stops · ${totalItemsCount} items · ${timeFormatted}`
        )}
      </div>

      {/* Content based on state */}
      <div className="mt-3">
        {state === 'loading' ? (
          /* Loading State: Skeleton shimmer rows */
          <div className="space-y-0" aria-label="Loading route preview">
            {[1, 2, 3, 4].map((i, index) => (
              <div
                key={i}
                className={`min-h-[44px] py-2.5 flex items-center justify-between ${
                  index !== 3 ? 'border-b-[0.5px] border-outline-variant/20 dark:border-white/5' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 rounded-full bg-on-surface/10 animate-pulse shrink-0" />
                  <div className="space-y-1">
                    <div className="h-4 w-32 bg-on-surface/10 rounded animate-pulse" />
                    <div className="h-3 w-20 bg-on-surface/10 rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-4 w-12 bg-on-surface/10 rounded animate-pulse" />
                  <div className="w-2 h-2 rounded-full bg-on-surface/10 shrink-0" />
                </div>
              </div>
            ))}
          </div>
        ) : state === 'empty' || totalStopsCount === 0 ? (
          /* Empty State */
          <div className="py-8 text-center text-[15px] opacity-60 text-on-surface font-normal">
            No route assigned today
          </div>
        ) : (
          /* Populated or Long List State */
          <div>
            <div className="space-y-0">
              {visibleStops.map((stop, index) => {
                const isFirst = index === 0;
                const isLast = index === visibleStops.length - 1 && (!isLong || isExpanded);

                return (
                  <div
                    key={stop.id || index}
                    style={{
                      animation: 'apple-row-rise 300ms cubic-bezier(0.25, 1, 0.5, 1) backwards',
                      animationDelay: `${index * 40}ms`
                    }}
                    className={`min-h-[44px] py-2.5 flex items-center justify-between ${
                      !isLast
                        ? 'border-b-[0.5px] border-outline-variant/30 dark:border-white/10'
                        : ''
                    } pointer-events-none`}
                  >
                    {/* Left: Sequence circle & Stop info */}
                    <div className="flex items-center gap-3 min-w-0 pr-2">
                      {/* Numbered circle with vertical connection line */}
                      <div className="relative flex flex-col items-center justify-center shrink-0 w-5 h-10">
                        {/* Upper connecting line */}
                        {!isFirst && (
                          <div className="absolute top-0 bottom-1/2 w-[1px] bg-on-surface/15 dark:bg-white/15 -translate-y-1" />
                        )}
                        {/* Lower connecting line */}
                        {!isLast && (
                          <div className="absolute top-1/2 bottom-0 w-[1px] bg-on-surface/15 dark:bg-white/15 translate-y-1" />
                        )}
                        {/* Numbered Circle */}
                        <div className="relative z-10 w-5 h-5 rounded-full flex items-center justify-center text-[11px] font-semibold tabular-nums border border-on-surface/20 dark:border-white/20 text-on-surface/80 dark:text-white/80 bg-surface-container-lowest dark:bg-[#1c1c1e] shadow-none">
                          {stop.stopNumber || index + 1}
                        </div>
                      </div>

                      {/* Stop Title & Area */}
                      <div className="min-w-0">
                        <p className="text-[17px] font-medium text-on-surface leading-snug truncate">
                          {stop.name}
                        </p>
                        <p className="text-[15px] opacity-60 text-on-surface leading-tight mt-0.5 truncate">
                          {getAreaLabel(stop.address || '')}
                        </p>
                      </div>
                    </div>

                    {/* Right: Item Count & Status Dot */}
                    <div className="flex items-center gap-3 shrink-0 pl-2">
                      <span className="text-[15px] opacity-60 text-on-surface tabular-nums font-normal">
                        {stop.products ? `${stop.products.length} items` : '8 items'}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${getStatusColor(stop.status)}`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Long list toggle button */}
            {isLong && (
              <div className="pt-3 border-t-[0.5px] border-outline-variant/30 dark:border-white/10 mt-1">
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-full text-center text-[15px] font-medium text-primary-container dark:text-inverse-primary hover:opacity-75 active:opacity-60 transition-opacity focus:outline-none"
                >
                  {isExpanded
                    ? 'Show fewer stops'
                    : `Show all ${totalStopsCount} stops`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes apple-row-rise {
          from {
            opacity: 0;
            transform: translateY(6px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </section>
  );
};
