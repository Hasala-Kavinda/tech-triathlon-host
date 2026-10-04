// src/state/slices/navigationSlice.ts - Navigation and screen stack management

import { useState, useCallback } from 'react';
import { ScreenName, TransitionType } from '@/shared/types';

export const getLogicalStackForScreen = (screen: ScreenName): ScreenName[] => {
  switch (screen) {
    case 'login':
      return ['login'];
    case 'meter_photo_start':
      return ['login', 'meter_photo_start'];
    case 'dashboard':
      return ['login', 'dashboard'];
    case 'market_detail':
      return ['login', 'dashboard', 'market_detail'];
    case 'pin_confirmation':
      return ['login', 'dashboard', 'market_detail', 'pin_confirmation'];
    case 'map':
      return ['login', 'dashboard', 'map'];
    case 'meter_photo_end':
      return ['login', 'dashboard', 'meter_photo_end'];
    case 'shift_summary':
      return ['login', 'dashboard', 'shift_summary'];
    case 'history':
      return ['login', 'history'];
    default:
      return ['login'];
  }
};

export const getFallbackPrevScreen = (
  current: ScreenName,
  returnTo: 'dashboard' | 'map'
): ScreenName => {
  switch (current) {
    case 'meter_photo_start':
      return 'login';
    case 'dashboard':
      return 'login';
    case 'market_detail':
      return returnTo === 'map' ? 'map' : 'dashboard';
    case 'pin_confirmation':
      return 'market_detail';
    case 'map':
      return 'dashboard';
    case 'meter_photo_end':
      return 'dashboard';
    case 'shift_summary':
      return 'login';
    case 'login':
    default:
      return 'login';
  }
};

export function useNavigationSlice(track: (id: string) => void) {
  const [historyStack, setHistoryStack] = useState<ScreenName[]>(['login']);
  const currentScreen: ScreenName = historyStack[historyStack.length - 1] || 'login';
  const [transitionType, setTransitionType] = useState<TransitionType>('replace');
  const [returnTo, setReturnTo] = useState<'dashboard' | 'map'>('dashboard');
  const [loginStage, setLoginStage] = useState<'stageA' | 'stageB'>('stageB');

  const pushScreen = useCallback((screen: ScreenName) => {
    setTransitionType('push');
    setHistoryStack((prev) => [...prev, screen]);
  }, []);

  const popScreen = useCallback(() => {
    track('G03');
    setTransitionType('pop');
    setHistoryStack((prev) => {
      let nextStack: ScreenName[];
      if (prev.length > 1) {
        nextStack = prev.slice(0, -1);
      } else {
        const current = prev[0] || 'login';
        const fallback = getFallbackPrevScreen(current, returnTo);
        nextStack = getLogicalStackForScreen(fallback);
      }

      const target = nextStack[nextStack.length - 1];
      if (target === 'login') {
        setLoginStage('stageB');
      }
      return nextStack;
    });
  }, [track, returnTo]);

  const replaceScreen = useCallback((screen: ScreenName) => {
    setTransitionType('replace');
    setHistoryStack((prev) => {
      const next = [...prev];
      if (next.length > 0) next[next.length - 1] = screen;
      else next.push(screen);
      return next;
    });
  }, []);

  return {
    historyStack,
    setHistoryStack,
    currentScreen,
    transitionType,
    setTransitionType,
    returnTo,
    setReturnTo,
    loginStage,
    setLoginStage,
    pushScreen,
    popScreen,
    replaceScreen
  };
}
