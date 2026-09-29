import React, { useState } from 'react';
import { useDriver } from '../state/driverContext';
import { useRoute } from '../state/routeContext';
import { TodayPlan } from '../components/TodayPlan';
import { SwipeBar } from '../components/SwipeBar';
import { DriverProfileHeader } from '../components/DriverProfileHeader';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { goOnline, setDriverData } = useDriver();
  const { routes, selectedRouteId, startRoute } = useRoute();
  const [isScrolled, setIsScrolled] = useState(false);

  // If none selected yet, default to the first route
  const effectiveRouteId = selectedRouteId ?? (routes.length > 0 ? routes[0].id : 1);
  const selectedRoute = routes.find((r) => r.id === effectiveRouteId);

  const handleStartShift = () => {
    if (!selectedRoute) return;
    startRoute(effectiveRouteId);
    setDriverData({
      driverId: 'FL-8821',
      name: 'Marcus Vance',
      vehicleInfo: 'Ford Transit 250 • Van #04',
      shiftStatus: 'online'
    });
    goOnline();

    setTimeout(() => {
      onSuccess();
    }, 200);
  };

  return (
    <main
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
      }}
      className="w-full max-w-[390px] min-h-[844px] h-screen bg-bg flex flex-col justify-between relative shadow-2xl border-x border-hairline/40 select-none overflow-hidden"
    >
      {/* CHANGE 1: Compact Top Bar (44px tall, solid matching page background, title centered in black/white) */}
      <header
        className={`w-full h-11 shrink-0 flex items-center justify-center bg-bg transition-all duration-150 z-20 ${
          isScrolled
            ? 'border-b-[0.5px] border-hairline'
            : 'border-b-[0.5px] border-transparent'
        }`}
      >
        <h1 className="text-[17px] font-semibold text-black dark:text-white tracking-tight">
          Fleet Logistics
        </h1>
      </header>

      {/* Main Content Area (Scroll container triggers top bar hairline) */}
      <div
        onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 0)}
        className="flex-1 px-4 space-y-4 overflow-y-auto pt-1"
      >
        {/* Apple-inspired Driver Profile Header (with Signal Indicator row) */}
        <DriverProfileHeader />

        {/* Today's Plan Card (Apple-inspired Inset Grouped Route Picker) */}
        <TodayPlan />
      </div>

      {/* Bottom Action & Shift Start Control */}
      <footer className="w-full bg-surface border-t border-hairline pt-2.5 pb-6 flex flex-col gap-2 shrink-0">
        {/* Shift Pre-Check Info */}
        <div className="flex items-center justify-between text-[13px] px-5">
          <span className="flex items-center gap-1.5 text-secondary">
            <span className="material-symbols-outlined text-[16px] text-success">
              check_small
            </span>
            Pre-trip inspection verified
          </span>
          <span className="text-black dark:text-white font-medium">Depot: North Hub</span>
        </div>

        {/* Redesigned Apple Slide-to-Unlock Swipe Bar: Defaults to selected route */}
        <SwipeBar
          selectedRouteNumber={selectedRoute ? selectedRoute.routeNumber : 1}
          onComplete={handleStartShift}
        />

        {/* Auxiliary Emergency & Support Link */}
        <div className="flex justify-between items-center text-[13px] pt-0.5 px-6">
          <button
            className="text-action hover:underline flex items-center gap-1 transition-colors"
            type="button"
            onClick={() => alert('Dispatch Support Line: +1 (800) 555-0199')}
          >
            <span className="material-symbols-outlined text-[16px]">help_outline</span>
            Terminal Dispatch Support
          </button>
          <button
            className="text-critical font-medium hover:underline flex items-center gap-1 transition-colors"
            type="button"
            onClick={() => alert('Account reset requested. Re-authenticating terminal.')}
          >
            <span className="material-symbols-outlined text-[16px]">lock_reset</span>
            Switch Account
          </button>
        </div>
      </footer>
    </main>
  );
};
