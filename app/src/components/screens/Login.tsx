// app/src/components/screens/Login.tsx - Screen 1: Sign in (Stage A) & Profile / Today's Plan (Stage B)

import React, { useState } from 'react';
import { useStore } from '../../state/store';
import { TopBar } from '../shared/TopBar';
import { SignalIndicator } from '../shared/SignalIndicator';
import { SwipeBar } from '../shared/SwipeBar';

export const Login: React.FC = () => {
  const {
    loginStage,
    setLoginStage,
    driver,
    routes,
    selectedRouteId,
    expandedRouteId,
    selectRoute,
    toggleExpandRoute,
    startRoute,
    pushScreen,
    conditions,
    updateCondition,
    showToast,
    track
  } = useStore();

  const [phone, setPhone] = useState('5550192834');
  const [code, setCode] = useState('482100');
  const [codeError, setCodeError] = useState(false);
  const [isLocatingGps, setIsLocatingGps] = useState(false);

  // L01 Validation: phone digits and 6 code digits
  const isPhoneComplete = phone.replace(/\D/g, '').length >= 10;
  const isCodeComplete = code.length === 6;
  const canSignIn = isPhoneComplete && isCodeComplete;

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSignIn) return;

    if (code === '000000') {
      setCodeError(true);
      track('L01');
      setTimeout(() => setCodeError(false), 800);
      return;
    }

    track('L01');
    track('L02');
    setLoginStage('stageB');
  };

  // L03 GPS Pill tap
  const handleGpsTap = () => {
    if (conditions.gpsStatus === 'on') return; // Tapping On does nothing
    setIsLocatingGps(true);
    track('L03');
    setTimeout(() => {
      setIsLocatingGps(false);
      updateCondition('gpsStatus', 'on');
    }, 600);
  };

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const inProgressRoute = routes.find((r) => r.status === 'in_progress');

  const handleStartOrClear = (routeId: number) => {
    if (selectedRouteId === routeId) {
      selectRoute(null);
    } else {
      selectRoute(routeId);
    }
  };

  const handleSwipeComplete = () => {
    track('L09');
    if (selectedRouteId) {
      startRoute(selectedRouteId);
    } else if (inProgressRoute) {
      startRoute(inProgressRoute.id);
    } else if (routes[0]) {
      startRoute(routes[0].id);
    }
    pushScreen('dashboard');
  };

  // Date formatted for Apple style: "Monday, Sep 28"
  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  const totalRoutes = routes.length;
  const totalOutlets = routes.reduce((sum, r) => sum + r.outlets.length, 0);
  const totalDistance = routes.reduce((sum, r) => sum + r.distanceKm, 0);

  return (
    <div className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none">
      <TopBar title="Fleet Logistics" />

      {/* Main Content Area */}
      <div className="flex-1 px-4 overflow-y-auto space-y-4 pt-1 pb-4">
        {loginStage === 'stageA' ? (
          /* STAGE A: Sign In Form */
          <div className="space-y-4 animate-replace-enter">
            <section
              aria-label="Shift Verification"
              className={`w-full bg-surface rounded-[20px] border border-hairline p-5 shadow-sm space-y-4 mt-2 ${
                codeError ? 'animate-pin-shake' : ''
              }`}
            >
              <div>
                <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white leading-tight">
                  Shift Verification
                </h2>
                <p className="text-[15px] text-secondary mt-1 leading-snug">
                  Confirm device identity to unlock scheduled distribution routes.
                </p>
              </div>

              {/* Phone Field */}
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-secondary">
                  Assigned Mobile Number
                </label>
                <div className="flex items-center h-12 w-full rounded-xl border border-hairline bg-surface px-3">
                  <div className="flex items-center gap-1.5 pr-2.5 mr-2.5 border-r border-hairline text-black dark:text-white text-[15px] font-medium">
                    <span>🇺🇸</span>
                    <span>+1</span>
                  </div>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Mobile number"
                    className="w-full bg-transparent border-0 p-0 text-black dark:text-white text-[15px] font-medium tracking-wide focus:outline-none font-mono tabular-nums"
                  />
                  {isPhoneComplete && (
                    <span className="material-symbols-outlined text-success text-[20px]">
                      check_circle
                    </span>
                  )}
                </div>
              </div>

              {/* OTP Field */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[13px]">
                  <label className="block font-medium text-secondary">
                    One-Time Security Token
                  </label>
                  <button
                    type="button"
                    onClick={() => showToast('Token resent via SMS')}
                    className="font-medium text-action cursor-pointer hover:underline"
                  >
                    Resend in 0:42
                  </button>
                </div>

                <div className="grid grid-cols-6 gap-2">
                  {[0, 1, 2, 3, 4, 5].map((i) => {
                    const digit = code[i] || '';
                    const isCurrent = code.length === i;
                    return (
                      <div
                        key={i}
                        className={`h-12 flex items-center justify-center rounded-xl bg-surface text-[20px] font-semibold text-black dark:text-white font-mono tabular-nums border ${
                          isCurrent
                            ? 'border-2 border-action ring-2 ring-action/30'
                            : codeError
                            ? 'border-critical text-critical'
                            : 'border-hairline'
                        }`}
                      >
                        {digit}
                      </div>
                    );
                  })}
                </div>

                {/* Input helper / code error */}
                {codeError ? (
                  <p className="text-[13px] text-critical font-medium pt-1">
                    Invalid security token. Use any 6 digits (e.g. 482100).
                  </p>
                ) : (
                  <p className="text-[12px] text-secondary/70 pt-0.5">
                    Enter any 6 digits (use 000000 to test invalid error state)
                  </p>
                )}
              </div>

              {/* Sign in Button */}
              <button
                type="button"
                onClick={handleSignIn}
                disabled={!canSignIn}
                className={`w-full h-12 rounded-xl text-[16px] font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  canSignIn
                    ? 'bg-action text-white shadow-sm hover:opacity-95 active:scale-[0.99]'
                    : 'bg-hairline/60 text-secondary cursor-not-allowed opacity-60'
                }`}
              >
                Sign in to Terminal
              </button>
            </section>
          </div>
        ) : (
          /* STAGE B: Signed in (Profile Header + Today's Plan + SwipeBar) */
          <div className="space-y-4">
            {/* Driver Profile Header (stagger 0ms) */}
            <section
              aria-label="Driver Profile Header"
              className="w-full px-1 pt-1 pb-1 select-none animate-row-enter"
              style={{ animationDelay: '0ms' }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 pr-3">
                  <h1 className="text-[28px] font-bold text-black dark:text-white leading-tight tracking-tight truncate">
                    {driver.name}
                  </h1>
                  <p className="text-[15px] text-secondary font-mono tabular-nums font-normal leading-tight mt-1">
                    ID {driver.driverId}
                  </p>
                  <p className="text-[15px] text-secondary tabular-nums font-normal leading-tight mt-0.5 truncate">
                    {driver.vehicleType} · {driver.plateNumber}
                  </p>
                </div>

                {/* GPS Status Pill */}
                <div className="flex flex-col items-end shrink-0 pt-0.5">
                  <div className="min-h-[44px] min-w-[44px] flex items-center justify-end">
                    <button
                      type="button"
                      onClick={handleGpsTap}
                      className={`h-8 px-3 rounded-full flex items-center gap-1.5 transition-colors cursor-pointer ${
                        conditions.gpsStatus === 'on'
                          ? 'bg-gps-tint text-success-text cursor-default'
                          : isLocatingGps
                          ? 'bg-attention/20 text-black dark:text-white'
                          : conditions.gpsStatus === 'blocked'
                          ? 'bg-critical/20 text-critical'
                          : 'bg-hairline/50 text-secondary'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          conditions.gpsStatus === 'on'
                            ? 'bg-success'
                            : isLocatingGps
                            ? 'bg-attention animate-pulse'
                            : conditions.gpsStatus === 'blocked'
                            ? 'bg-critical'
                            : 'bg-secondary'
                        }`}
                      />
                      <span className="text-[13px] font-medium tracking-tight">
                        {isLocatingGps
                          ? 'Locating…'
                          : conditions.gpsStatus === 'on'
                          ? 'GPS: On'
                          : conditions.gpsStatus === 'blocked'
                          ? 'GPS: Blocked'
                          : conditions.gpsStatus === 'unavailable'
                          ? 'GPS: N/A'
                          : 'GPS: Off'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Signal Indicator Row */}
              <div className="mt-3">
                <SignalIndicator
                  networkStatus={conditions.networkStatus}
                  gpsStatus={conditions.gpsStatus}
                  gpsQuality={conditions.gpsQuality}
                  showHelperAlways={true}
                />
              </div>
            </section>

            {/* Today's Plan Card (stagger 40ms) */}
            <section
              aria-label="Today's Plan"
              className="w-full bg-surface rounded-[20px] border border-hairline p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] select-none animate-row-enter"
              style={{ animationDelay: '40ms' }}
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-[22px] font-semibold tracking-tight text-black dark:text-white leading-none">
                  Today's Plan
                </h2>
                <span className="text-[15px] text-secondary tabular-nums font-normal">
                  {dateFormatted}
                </span>
              </div>

              <div className="mt-1.5 text-[15px] text-secondary tabular-nums font-normal leading-normal">
                {totalRoutes} routes · {totalOutlets} outlets · {totalDistance} km
              </div>

              {/* Routes List */}
              <div className="mt-2 divide-y-[0.5px] divide-hairline">
                {routes.map((route, idx) => {
                  const isExpanded = expandedRouteId === route.id;
                  const isSelected = selectedRouteId === route.id;
                  const isInProg = route.status === 'in_progress';
                  const isDone = route.status === 'completed';
                  const otherRouteInProgress = inProgressRoute && inProgressRoute.id !== route.id;

                  return (
                    <div key={route.id} className="transition-colors duration-150">
                      {/* Accordion header button */}
                      <button
                        type="button"
                        onClick={() => toggleExpandRoute(route.id)}
                        className="w-full min-h-[44px] py-2.5 flex items-center justify-between text-left focus:outline-none cursor-pointer"
                      >
                        <div className="flex items-baseline gap-2 min-w-0 pr-2">
                          <span
                            className={`text-[17px] font-medium tracking-tight ${
                              isSelected ? 'text-action font-semibold' : 'text-black dark:text-white'
                            }`}
                          >
                            Route {route.routeNumber}
                          </span>
                          <span className="text-[15px] text-secondary tabular-nums font-normal truncate">
                            {route.outlets.length} outlets · {route.distanceKm} km
                            {isSelected && (
                              <span className="ml-1.5 inline-flex items-center font-medium text-action">
                                · Selected
                              </span>
                            )}
                            {isInProg && (
                              <span className="ml-1.5 inline-flex items-center font-medium text-action">
                                · In Progress
                              </span>
                            )}
                            {isDone && (
                              <span className="ml-1.5 inline-flex items-center font-medium text-success">
                                · Completed
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2.5 shrink-0 pl-2">
                          <span
                            className={`w-2 h-2 rounded-full shrink-0 ${
                              isDone ? 'bg-success' : isInProg ? 'bg-action' : 'bg-pending'
                            }`}
                          />
                          <span
                            className={`material-symbols-outlined text-[20px] transition-transform duration-300 transform select-none ${
                              isExpanded ? 'rotate-90 text-action' : 'rotate-0 text-secondary'
                            }`}
                          >
                            chevron_right
                          </span>
                        </div>
                      </button>

                      {/* Expanded Accordion Area (300ms transition) */}
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-out ${
                          isExpanded ? 'max-h-[380px] opacity-100 pb-3' : 'max-h-0 opacity-0 pb-0'
                        }`}
                      >
                        <div className="pt-1.5 pb-1 px-1">
                          <div className="text-[13px] font-medium tracking-wide uppercase text-secondary pb-1.5">
                            {route.brandName}
                          </div>

                          {/* Outlets list (internally scrollable for L10) */}
                          <div
                            onScroll={() => track('L10')}
                            className="max-h-[220px] overflow-y-auto space-y-0.5 divide-y-[0.5px] divide-hairline/40 pr-1"
                          >
                            {route.outlets.map((outlet, oIdx) => (
                              <div
                                key={outlet.id || oIdx}
                                className="min-h-[40px] py-1.5 flex items-center justify-between text-[15px]"
                              >
                                <span className="text-black dark:text-white font-normal">
                                  {outlet.city}
                                </span>
                                <span className="text-secondary tabular-nums font-normal text-right shrink-0 pl-3">
                                  {outlet.itemCount} items
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Start / Selected / Resume Button */}
                          <div className="pt-3">
                            {isDone ? (
                              <button
                                type="button"
                                disabled
                                className="w-full h-[44px] rounded-[12px] bg-hairline/50 text-secondary text-[15px] font-medium flex items-center justify-center cursor-not-allowed"
                              >
                                Route Completed
                              </button>
                            ) : otherRouteInProgress ? (
                              <button
                                type="button"
                                disabled
                                className="w-full h-[44px] rounded-[12px] bg-hairline/40 text-secondary/60 text-[14px] font-medium flex items-center justify-center cursor-not-allowed"
                              >
                                Finish Route {inProgressRoute.routeNumber} first
                              </button>
                            ) : isInProg ? (
                              <button
                                type="button"
                                onClick={() => handleStartOrClear(route.id)}
                                className="w-full h-[44px] rounded-[12px] bg-action text-white text-[15px] font-semibold flex items-center justify-center cursor-pointer shadow-sm"
                              >
                                Resume Route {route.routeNumber}
                              </button>
                            ) : isSelected ? (
                              <button
                                type="button"
                                onClick={() => handleStartOrClear(route.id)}
                                className="w-full h-[44px] rounded-[12px] border border-action flex items-center justify-center gap-1.5 text-[15px] font-semibold text-action bg-transparent cursor-pointer active:opacity-75 transition-opacity"
                              >
                                <span className="material-symbols-outlined text-[18px]">check</span>
                                <span>Selected</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleStartOrClear(route.id)}
                                className="w-full h-[44px] rounded-[12px] bg-action flex items-center justify-center text-[15px] font-semibold text-white shadow-sm cursor-pointer active:opacity-90 transition-opacity"
                              >
                                Start Route {route.routeNumber}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Footer Area with Inspection & SwipeBar */}
      {loginStage === 'stageB' && (
        <footer
          className="w-full bg-surface border-t border-hairline pt-2.5 pb-6 flex flex-col gap-2 shrink-0 animate-row-enter z-20"
          style={{ animationDelay: '80ms' }}
        >
          <div className="flex items-center justify-between text-[13px] px-5">
            <span className="flex items-center gap-1.5 text-secondary">
              <span className="material-symbols-outlined text-[16px] text-success">
                check_small
              </span>
              Pre-trip inspection verified
            </span>
            <span className="text-black dark:text-white font-medium">Depot: North Hub</span>
          </div>

          <SwipeBar
            selectedRouteNumber={selectedRoute ? selectedRoute.routeNumber : inProgressRoute ? inProgressRoute.routeNumber : undefined}
            isInProgress={!!inProgressRoute}
            onComplete={handleSwipeComplete}
          />

          <div className="flex justify-between items-center text-[13px] pt-0.5 px-6">
            <button
              className="text-action hover:underline flex items-center gap-1 transition-colors cursor-pointer"
              type="button"
              onClick={() => showToast('Dispatch support: +1 (800) 555-0199')}
            >
              <span className="material-symbols-outlined text-[16px]">help_outline</span>
              Terminal Dispatch Support
            </button>
            <button
              className="text-critical font-medium hover:underline flex items-center gap-1 transition-colors cursor-pointer"
              type="button"
              onClick={() => setLoginStage('stageA')}
            >
              <span className="material-symbols-outlined text-[16px]">lock_reset</span>
              Switch Account
            </button>
          </div>
        </footer>
      )}
    </div>
  );
};
