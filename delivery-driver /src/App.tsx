// app/src/App.tsx - Root prototype container for Figma Make preview

import React from 'react';
import { StoreProvider, useStore } from './state/store';
import { Login } from './components/screens/Login';
import { RouteDashboard } from './components/screens/RouteDashboard';
import { MarketDetail } from './components/screens/MarketDetail';
import { PinConfirmation } from './components/screens/PinConfirmation';
import { MapNavigation } from './components/screens/MapNavigation';
import { ShiftSummary } from './components/screens/ShiftSummary';
import { MeterPhotoScreen } from './components/screens/MeterPhotoScreen';
import { Toast } from './components/shared/Toast';
import './styles/globals.css';

const PrototypeCanvas: React.FC = () => {
  const store = useStore();
  const { currentScreen, transitionType, toastMessage, jumpToScreen } = store;

  if (typeof window !== 'undefined') {
    (window as any).__store = store;
  }

  const getTransitionClass = () => {
    if (transitionType === 'push') return 'screen-push-enter';
    if (transitionType === 'pop') return 'screen-pop-enter';
    return 'screen-replace-enter';
  };

  const isMapScreen = currentScreen === 'map';

  return (
    <div className="relative flex items-center justify-center min-h-[100vh] min-h-[100dvh] w-full bg-bg py-0 sm:py-6 selection:bg-primary-container">
      {/* Viewport: on phones (< sm / 640px) fills 100% width and height edge-to-edge.
          On desktop / tablet (sm: and above) centers as preview container (max-w-[440px] or max-w-[1180px] for map). */}
      <div
        className={`w-full transition-all duration-300 overflow-hidden relative bg-bg flex flex-col justify-between ${
          isMapScreen
            ? 'w-full max-w-[1180px] h-[100vh] h-[100dvh] sm:h-[844px] sm:rounded-[32px] sm:border sm:border-hairline sm:shadow-2xl'
            : 'w-full h-[100vh] h-[100dvh] sm:h-[844px] sm:max-w-[440px] sm:rounded-[36px] sm:border sm:border-hairline sm:shadow-2xl'
        }`}
        style={{
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", Inter, sans-serif'
        }}
      >
        {/* Animated screen container */}
        <div key={currentScreen} className={`w-full h-full ${getTransitionClass()}`}>
          {currentScreen === 'login' && <Login />}
          {currentScreen === 'meter_photo_start' && <MeterPhotoScreen moment="start" />}
          {currentScreen === 'dashboard' && <RouteDashboard />}
          {currentScreen === 'market_detail' && <MarketDetail />}
          {currentScreen === 'pin_confirmation' && <PinConfirmation />}
          {currentScreen === 'meter_photo_end' && <MeterPhotoScreen moment="end" />}
          {currentScreen === 'map' && <MapNavigation />}
          {currentScreen === 'shift_summary' && <ShiftSummary />}
        </div>

        {/* 36px In-App Toast (The ONLY new element inside phone) */}
        <Toast message={toastMessage} />
      </div>

      {/* Floating Figma Make Screen Switcher Dock (discreet bar for prototype testing) */}
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/90 text-neutral-300 rounded-full text-[11px] backdrop-blur-md border border-neutral-700 shadow-xl select-none">
        <span className="font-semibold text-neutral-400 uppercase tracking-wider text-[10px] mr-1">
          Figma Make Screens:
        </span>
        <button
          type="button"
          onClick={() => jumpToScreen('login')}
          className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
            currentScreen === 'login' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
          }`}
        >
          1. Login
        </button>
        <button
          type="button"
          onClick={() => jumpToScreen('meter_photo_start')}
          className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
            currentScreen === 'meter_photo_start' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
          }`}
        >
          Start Meter
        </button>
        <button
          type="button"
          onClick={() => jumpToScreen('dashboard')}
          className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
            currentScreen === 'dashboard' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
          }`}
        >
          2. Route
        </button>
        <button
          type="button"
          onClick={() => jumpToScreen('market_detail')}
          className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
            currentScreen === 'market_detail' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
          }`}
        >
          3. Detail
        </button>
        <button
          type="button"
          onClick={() => jumpToScreen('pin_confirmation')}
          className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
            currentScreen === 'pin_confirmation' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
          }`}
        >
          4. PIN
        </button>
        <button
          type="button"
          onClick={() => jumpToScreen('meter_photo_end')}
          className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
            currentScreen === 'meter_photo_end' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
          }`}
        >
          End Meter
        </button>
        <button
          type="button"
          onClick={() => jumpToScreen('map')}
          className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
            currentScreen === 'map' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
          }`}
        >
          5. Map
        </button>
        <button
          type="button"
          onClick={() => jumpToScreen('shift_summary')}
          className={`px-2 py-0.5 rounded-full transition-colors cursor-pointer ${
            currentScreen === 'shift_summary' ? 'bg-primary text-white font-bold' : 'hover:bg-neutral-800'
          }`}
        >
          6. Summary
        </button>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <StoreProvider>
      <PrototypeCanvas />
    </StoreProvider>
  );
}
