// src/features/auth/components/LoginScreen.tsx - Main login screen component

import React, { useState, useEffect } from 'react';
import { useStore } from '@/state/store';
import { TopBar, SignalIndicator, SwipeBar, SignOutSheet } from '@/shared/components/ui';
import { isDemoMode } from '@/shared/lib/demo';
import { DriverProfileHeader } from './DriverProfileHeader';
import { RoutePlanCard } from './RoutePlanCard';
import { driverApi } from '@/api/driver';

export const LoginScreen: React.FC = () => {
  const {
    driver,
    routes,
    selectedRouteId,
    expandedRouteId,
    selectRoute,
    toggleExpandRoute,
    startRoute,
    setRouteVersion,
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

  const handleStartOrClear = async (routeId: number) => {
    if (selectedRouteId === routeId) {
      selectRoute(null);
    } else {
      if (isOffline) {
        showToast("Reconnect before claiming a route");
        return;
      }
      if (!window.confirm("Are you sure you really need to claim this load?")) return;
      const route = routes.find((candidate) => candidate.id === routeId);
      if (route?.apiId && route.version !== undefined && route.vehicleId) {
        try {
          const bootstrap = await driverApi.claimAndBootstrap(route.apiId, route.vehicleId, route.version);
          setRouteVersion(route.id, bootstrap.bootstrapVersion);
          showToast('Route claimed, vehicle confirmed, and saved for offline use');
        } catch (error) {
          showToast(error instanceof Error ? error.message : 'Unable to claim this route');
          return;
        }
      }
      selectRoute(routeId);
    }
  };

  const handleSwipeComplete = () => {
    track('L09');
    const targetRouteId = selectedRouteId || inProgressRoute?.id || routes[0]?.id;
    if (targetRouteId) {
      startRoute(targetRouteId);
    }

    if (targetRouteId && meterPhotos[targetRouteId]?.start) {
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

  const totalRoutes = routes.length;
  const totalOutlets = routes.reduce((sum, r) => sum + r.outlets.length, 0);
  const totalDistance = routes.reduce((sum, r) => sum + r.distanceKm, 0);

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
          onStartOrClear={handleStartOrClear}
          onTrackScroll={() => track('L10')}
        />
      </div>

      {/* Footer Area with Inspection & SwipeBar */}
      <footer
        className="w-full bg-surface border-t border-hairline pt-2.5 flex flex-col gap-2 shrink-0 animate-row-enter z-20"
        style={{
          animationDelay: '80ms',
          paddingBottom: 'max(24px, calc(10px + env(safe-area-inset-bottom, 0px)))'
        }}
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

        <div className="flex justify-center items-center text-[13px] pt-0.5 px-6">
          <button
            className="text-action hover:underline flex items-center gap-1 transition-colors cursor-pointer"
            type="button"
            onClick={() => showToast('Dispatch support: +1 (800) 555-0199')}
          >
            <span className="material-symbols-outlined text-[16px]">help_outline</span>
            Terminal Dispatch Support
          </button>
        </div>
      </footer>

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
