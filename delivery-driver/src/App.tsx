// app/src/App.tsx - Root prototype container for Figma Make preview

import React, { useState } from 'react';
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
  const [showDesktopWarning, setShowDesktopWarning] = useState(true);

  if (typeof window !== 'undefined') {
    (window as any).__store = store;
  }

  const getTransitionClass = () => {
    if (transitionType === 'push') return 'screen-push-enter';
    if (transitionType === 'pop') return 'screen-pop-enter';
    return 'screen-replace-enter';
  };

  return (
    <div className="relative flex flex-col items-center justify-start sm:justify-center min-h-[100vh] min-h-[100dvh] w-full bg-bg py-0 sm:py-6 px-3 sm:pb-20 selection:bg-primary-container">
      {/* Desktop Viewport Warning (Simple, clean notification outside the mobile frame) */}
      {showDesktopWarning && (
        <div className="hidden sm:flex items-center justify-between gap-3 px-4 py-2.5 mb-3 w-full max-w-[440px] bg-surface/90 dark:bg-surface/80 border border-hairline rounded-2xl shadow-sm backdrop-blur-md text-[13px] text-secondary select-none transition-all">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="material-symbols-outlined text-[20px] text-amber-500 shrink-0">
              phone_iphone
            </span>
            <div className="text-[12px] leading-tight">
              <span className="font-semibold text-black dark:text-white">Mobile View Recommended: </span>
              <span>
                For the best driver experience, switch your browser to mobile view (e.g.{' '}
                <strong className="font-semibold text-action font-mono">iPhone 16 / 393×852</strong>) in DevTools or open on a mobile phone.
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDesktopWarning(false)}
            aria-label="Dismiss warning"
            className="text-secondary/60 hover:text-black dark:hover:text-white p-1 rounded-md transition-colors cursor-pointer shrink-0"
            title="Dismiss notice"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Viewport: on phones (< sm / 640px) fills 100% width and height edge-to-edge.
          On desktop / tablet (sm: and above) centers with consistent width across all screens. */}
      <div
        className="w-full h-[100vh] h-[100dvh] sm:h-[844px] sm:max-w-[440px] sm:rounded-[36px] sm:border sm:border-hairline sm:shadow-2xl overflow-hidden relative bg-bg flex flex-col justify-between"
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

      {/* Floating Prototype Screen Switcher Dock (discreet bar clearly indicated as only for prototyping) */}
      <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/95 text-neutral-300 rounded-full text-[11px] backdrop-blur-md border border-neutral-700 shadow-2xl select-none overflow-x-auto max-w-[96vw]">
        {/* Left corner: Prototype Navigation Only */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 text-[9px] font-bold uppercase tracking-wider shrink-0 mr-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span>Prototype Navigation Only</span>
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
