// src/app/App.tsx - Production-grade responsive application shell with React 19 ErrorBoundary

import React, { lazy, Suspense } from 'react';
import { StoreProvider, useStore } from '@/state/store';
import { Toast } from '@/shared/components/ui';
import { isDemoMode } from '@/shared/lib/demo';
import { ErrorBoundary } from './ErrorBoundary';
import '@/styles/globals.css';

// Feature screens (lazy loaded for optimal bundle splitting)
const LoginScreen = lazy(() =>
  import('@/features/auth').then((m) => ({ default: m.LoginScreen }))
);
const DashboardScreen = lazy(() =>
  import('@/features/dashboard').then((m) => ({ default: m.DashboardScreen }))
);
const MarketDetailScreen = lazy(() =>
  import('@/features/market-detail').then((m) => ({ default: m.MarketDetailScreen }))
);
const PinConfirmationScreen = lazy(() =>
  import('@/features/pin-confirmation').then((m) => ({ default: m.PinConfirmationScreen }))
);
const MapNavigationScreen = lazy(() =>
  import('@/features/map-navigation').then((m) => ({ default: m.MapNavigationScreen }))
);
const ShiftSummaryScreen = lazy(() =>
  import('@/features/shift-summary').then((m) => ({ default: m.ShiftSummaryScreen }))
);
const MeterPhotoScreen = lazy(() =>
  import('@/features/meter-photo').then((m) => ({ default: m.MeterPhotoScreen }))
);

const ScreenFallback: React.FC = () => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-bg select-none">
    <div className="w-8 h-8 rounded-full border-2 border-action border-t-transparent animate-spin mb-2" />
    <span className="text-[13px] font-medium text-secondary">Loading…</span>
  </div>
);

const AppShell: React.FC = () => {
  const store = useStore();
  const { currentScreen, transitionType, toastMessage, jumpToScreen } = store;
  const demoActive = isDemoMode();

  if (demoActive && typeof window !== 'undefined') {
    (window as any).__store = store;
  }

  const getTransitionClass = () => {
    if (transitionType === 'push') return 'screen-push-enter';
    if (transitionType === 'pop') return 'screen-pop-enter';
    return 'screen-replace-enter';
  };

  return (
    <div className="w-full min-h-[100vh] min-h-[100dvh] bg-bg flex justify-center items-stretch selection:bg-primary-container">
      {/* Mobile-first centered column (320px fluid to 480px max on desktop) */}
      <div
        className="w-full max-w-[480px] min-h-[100vh] min-h-[100dvh] bg-bg sm:border-x sm:border-hairline/60 flex flex-col justify-between relative overflow-hidden"
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
        }}
      >
        <ErrorBoundary>
          <Suspense fallback={<ScreenFallback />}>
            <div key={currentScreen} className={`w-full h-full flex-1 flex flex-col ${getTransitionClass()}`}>
              {currentScreen === 'login' && <LoginScreen />}
              {currentScreen === 'meter_photo_start' && <MeterPhotoScreen moment="start" />}
              {currentScreen === 'dashboard' && <DashboardScreen />}
              {currentScreen === 'market_detail' && <MarketDetailScreen />}
              {currentScreen === 'pin_confirmation' && <PinConfirmationScreen />}
              {currentScreen === 'meter_photo_end' && <MeterPhotoScreen moment="end" />}
              {currentScreen === 'map' && <MapNavigationScreen />}
              {currentScreen === 'shift_summary' && <ShiftSummaryScreen />}
            </div>
          </Suspense>
        </ErrorBoundary>

        <Toast message={toastMessage} />
      </div>

      {/* Floating Demo Screen Switcher Dock: only visible when ?demo=1 */}
      {demoActive && (
        <aside
          aria-label="Demo switcher"
          className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/95 text-neutral-300 rounded-full text-[11px] backdrop-blur-md border border-neutral-700 shadow-2xl select-none overflow-x-auto max-w-[96vw]"
        >
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider shrink-0 mr-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span>Demo Mode</span>
          </div>

          <button
            type="button"
            onClick={() => jumpToScreen('login')}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              currentScreen === 'login' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            1. Login
          </button>
          <button
            type="button"
            onClick={() => jumpToScreen('meter_photo_start')}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              currentScreen === 'meter_photo_start' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            Start Meter
          </button>
          <button
            type="button"
            onClick={() => jumpToScreen('dashboard')}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              currentScreen === 'dashboard' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            2. Route
          </button>
          <button
            type="button"
            onClick={() => jumpToScreen('market_detail')}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              currentScreen === 'market_detail' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            3. Detail
          </button>
          <button
            type="button"
            onClick={() => jumpToScreen('pin_confirmation')}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              currentScreen === 'pin_confirmation' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            4. PIN
          </button>
          <button
            type="button"
            onClick={() => jumpToScreen('meter_photo_end')}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              currentScreen === 'meter_photo_end' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            End Meter
          </button>
          <button
            type="button"
            onClick={() => jumpToScreen('map')}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              currentScreen === 'map' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            5. Map
          </button>
          <button
            type="button"
            onClick={() => jumpToScreen('shift_summary')}
            className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer shrink-0 ${
              currentScreen === 'shift_summary' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
            }`}
          >
            6. Summary
          </button>
        </aside>
      )}
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  );
}
