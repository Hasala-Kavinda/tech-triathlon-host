// src/features/auth/components/LoginScreen.tsx - Today's routes: claim, select, then swipe to start

import React, { useState, useEffect } from 'react';
import { useStore } from '@/state/store';
import { TopBar, SignalIndicator, SwipeBar, SignOutSheet, ConfirmDialog } from '@/shared/components/ui';
import { isDemoMode } from '@/shared/lib/demo';
import { readSession } from '@/auth/session';
import { hasCachedManifest } from '@/offline/db';
import { listSyncIssues } from '@/offline/syncQueue';
import { DriverProfileHeader } from './DriverProfileHeader';
import { RoutePlanCard } from './RoutePlanCard';

const PROTOTYPE = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === 'true';

export const LoginScreen: React.FC = () => {
  const {
    driver,
    routes,
    routesStatus,
    routesError,
    reloadRoutes,
    selectedRouteId,
    expandedRouteId,
    selectRoute,
    toggleExpandRoute,
    claimRoute,
    pushScreen,
    conditions,
    updateCondition,
    showToast,
    meterPhotos,
    syncPendingOutlets,
    isSyncing,
    resetDemo,
    track
  } = useStore();

  const [isLocatingGps, setIsLocatingGps] = useState(false);
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [claimTarget, setClaimTarget] = useState<number | null>(null);
  const [isClaiming, setIsClaiming] = useState(false);
  const [syncIssues, setSyncIssues] = useState(0);

  // Sync real browser connectivity
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleOnline = () => updateCondition('networkStatus', 'good');
    const handleOffline = () => updateCondition('networkStatus', 'offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (!navigator.onLine) {
      updateCondition('networkStatus', 'offline');
    }
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [updateCondition]);

  // Changes the server turned down stay on the phone; tell the Driver instead of keeping quiet.
  useEffect(() => {
    if (PROTOTYPE) return;
    let active = true;
    const check = () => void listSyncIssues().then((items) => { if (active) setSyncIssues(items.length); }).catch(() => undefined);
    check();
    const timer = window.setInterval(check, 5_000);
    return () => { active = false; window.clearInterval(timer); };
  }, []);

  const pendingOutletsCount = routes.flatMap((r) => r.outlets).filter((o) => o.syncStatus === 'pending').length;
  const pendingPhotosCount = Object.values(meterPhotos).reduce(
    (acc, p) => acc + (p?.start?.syncStatus === 'pending' ? 1 : 0) + (p?.end?.syncStatus === 'pending' ? 1 : 0),
    0
  );
  const pendingSyncCount = pendingOutletsCount + pendingPhotosCount;
  const isOffline = conditions.networkStatus === 'offline' || (typeof navigator !== 'undefined' && !navigator.onLine);
  const isRouteInProgress = routes.some((r) => r.status === 'in_progress');

  const handleGpsTap = () => {
    if (conditions.gpsStatus === 'on') return;
    setIsLocatingGps(true);
    track('L03');

    if (isDemoMode() || typeof navigator === 'undefined' || !navigator.geolocation) {
      setTimeout(() => {
        setIsLocatingGps(false);
        updateCondition('gpsStatus', 'on');
      }, 600);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      () => {
        setIsLocatingGps(false);
        updateCondition('gpsStatus', 'on');
        showToast('GPS active · location locked');
      },
      (err) => {
        setIsLocatingGps(false);
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

  const selectedRoute = routes.find((r) => r.id === selectedRouteId);
  const inProgressRoute = routes.find((r) => r.status === 'in_progress');

  // Claiming asks first (the spec's strong confirmation), then claims and confirms the vehicle.
  const handleClaimRequest = (routeId: number) => {
    if (isOffline) {
      showToast('Reconnect before claiming a route');
      return;
    }
    setClaimTarget(routeId);
  };

  const handleClaimConfirmed = async () => {
    if (claimTarget === null) return;
    setIsClaiming(true);
    try {
      await claimRoute(claimTarget);
      showToast('Route claimed, vehicle confirmed, and saved for offline use');
      setClaimTarget(null);
    } catch (error) {
      setClaimTarget(null);
      showToast(error instanceof Error ? error.message : 'Unable to claim this route');
    } finally {
      setIsClaiming(false);
    }
  };

  // Selecting is its own action: it only chooses which claimed route to work.
  const handleSelect = (routeId: number) => {
    if (selectedRouteId === routeId) {
      selectRoute(null);
      return;
    }
    const route = routes.find((candidate) => candidate.id === routeId);
    if (route?.apiId && !route.claimed) {
      showToast('Claim this route first');
      return;
    }
    selectRoute(routeId);
  };

  // The swipe only opens the start meter photo, and only once everything the spec requires is in place.
  const handleSwipeComplete = async () => {
    track('L09');

    // A trip that is already on the road is resumed, not started again.
    if (inProgressRoute && (!selectedRoute || selectedRoute.id === inProgressRoute.id)) {
      selectRoute(inProgressRoute.id);
      pushScreen('dashboard');
      return;
    }

    const target = selectedRoute;
    if (!target) return;

    if (target.apiId && !PROTOTYPE) {
      if (!target.claimed || !target.vehicleConfirmed) {
        showToast('Claim this route and confirm the vehicle first.');
        return;
      }
      if (!(await hasCachedManifest(target.apiId))) {
        showToast('This route is not saved on your phone yet. Reconnect and claim it again.');
        return;
      }
      if (conditions.gpsStatus !== 'on') {
        showToast('Turn on GPS before starting. Tap the GPS pill.');
        handleGpsTap();
        return;
      }
      if (isOffline) {
        showToast('Reconnect to start. The start meter photo is uploaded first.');
        return;
      }
    }

    if (meterPhotos[target.id]?.start) {
      pushScreen('dashboard');
    } else {
      pushScreen('meter_photo_start');
    }
  };

  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  }).format(new Date());

  // The server lists trips for today in Asia/Colombo; say which day that is.
  const todayLabel = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Colombo', weekday: 'short', day: 'numeric', month: 'short' }).format(new Date());

  const totalRoutes = routes.length;
  const totalOutlets = routes.reduce((sum, r) => sum + r.outlets.length, 0);
  const totalDistance = routes.reduce((sum, r) => sum + r.distanceKm, 0);
  const depot = readSession()?.user.depot;

  return (
    <div className="w-full h-full flex flex-col justify-between bg-bg relative overflow-hidden select-none">
      <TopBar title="Fleet Logistics" />

      {/* Main Content Area */}
      <div className="flex-1 px-4 overflow-y-auto space-y-4 pt-1 pb-4">
        <DriverProfileHeader
          driver={driver}
          conditions={conditions}
          isLocatingGps={isLocatingGps}
          onGpsTap={handleGpsTap}
          onOpenSignOut={() => setIsSignOutOpen(true)}
        />

        <div className="mt-3">
          <SignalIndicator
            networkStatus={conditions.networkStatus}
            gpsStatus={conditions.gpsStatus}
            gpsQuality={conditions.gpsQuality}
            showHelperAlways={true}
          />
        </div>

        {syncIssues > 0 && (
          <div role="alert" className="w-full rounded-[14px] border border-critical/40 bg-critical/10 px-4 py-3 text-[14px] leading-snug text-black dark:text-white">
            <strong className="font-semibold">{syncIssues} saved {syncIssues === 1 ? 'change was' : 'changes were'} not accepted by the server.</strong>{' '}
            They are kept on this phone. Tell Dispatch.
          </div>
        )}

        {routesStatus === 'loading' && (
          <p role="status" className="text-[15px] text-secondary text-center py-8">Loading your routes…</p>
        )}

        {routesStatus === 'error' && (
          <div role="alert" className="w-full bg-surface rounded-[20px] border border-hairline p-5 text-center">
            <p className="text-[15px] text-black dark:text-white">Your routes could not be loaded.</p>
            <p className="text-[13px] text-secondary mt-1">{routesError}</p>
            <button
              type="button"
              onClick={() => void reloadRoutes()}
              className="mt-3 h-11 px-5 rounded-xl border border-action text-action text-[15px] font-semibold cursor-pointer"
            >
              Try again
            </button>
          </div>
        )}

        {routesStatus === 'ready' && routes.length === 0 && (
          <div className="w-full bg-surface rounded-[20px] border border-hairline p-5 text-center">
            <p className="text-[17px] font-semibold text-black dark:text-white">No routes for you today</p>
            <p className="text-[14px] text-secondary mt-1 leading-snug">
              A route appears here once the Dispatcher assigns it to you and the Loader confirms the load.
              Only trips scheduled for today are listed.
            </p>
            <p className="text-[12px] text-secondary mt-2 tabular-nums">
              Checked for {todayLabel} · {driver.driverId}
            </p>
            <button
              type="button"
              onClick={() => void reloadRoutes()}
              className="mt-3 h-11 px-5 rounded-xl border border-action text-action text-[15px] font-semibold cursor-pointer"
            >
              Refresh
            </button>
          </div>
        )}

        {routes.length > 0 && (
          <RoutePlanCard
            routes={routes}
            selectedRouteId={selectedRouteId}
            expandedRouteId={expandedRouteId}
            inProgressRoute={inProgressRoute}
            dateFormatted={dateFormatted}
            totalRoutes={totalRoutes}
            totalOutlets={totalOutlets}
            totalDistance={totalDistance}
            onToggleExpand={toggleExpandRoute}
            onClaim={handleClaimRequest}
            onSelect={handleSelect}
            onTrackScroll={() => track('L10')}
          />
        )}
      </div>

      {/* Footer Area with SwipeBar */}
      <footer
        className="w-full bg-surface border-t border-hairline pt-2.5 flex flex-col gap-2 shrink-0 animate-row-enter z-20"
        style={{
          animationDelay: '80ms',
          paddingBottom: 'max(24px, calc(10px + env(safe-area-inset-bottom, 0px)))'
        }}
      >
        <div className="flex items-center justify-between text-[13px] px-5">
          <span className="text-secondary">Start needs: claimed route · GPS on · connection</span>
          {depot && <span className="text-black dark:text-white font-medium">Depot: {depot}</span>}
        </div>

        <SwipeBar
          selectedRouteNumber={selectedRoute ? selectedRoute.routeNumber : inProgressRoute ? inProgressRoute.routeNumber : undefined}
          isInProgress={!!inProgressRoute}
          onComplete={() => void handleSwipeComplete()}
        />

        <div className="flex justify-center items-center text-[13px] pt-0.5 px-6">
          <button
            className="text-action hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            type="button"
            onClick={() => pushScreen('history')}
          >
            <span className="material-symbols-outlined text-[16px]">history</span>
            Order and delivery history
          </button>
        </div>
      </footer>

      <ConfirmDialog
        isOpen={claimTarget !== null}
        title="Claim this route?"
        message="Are you sure you really need to claim this load?"
        confirmLabel="Claim route"
        isBusy={isClaiming}
        onConfirm={() => void handleClaimConfirmed()}
        onCancel={() => setClaimTarget(null)}
      />

      <SignOutSheet
        isOpen={isSignOutOpen}
        onClose={() => setIsSignOutOpen(false)}
        pendingSyncCount={pendingSyncCount}
        isOffline={isOffline}
        isRouteInProgress={isRouteInProgress}
        onSyncNow={syncPendingOutlets}
        isSyncing={isSyncing}
        onPerformReset={resetDemo}
      />
    </div>
  );
};
