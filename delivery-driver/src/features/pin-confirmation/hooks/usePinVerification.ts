// src/features/pin-confirmation/hooks/usePinVerification.ts - Hook handling 4-digit PIN verification logic

import { useState, useEffect } from 'react';
import { useStore } from '@/state/store';
import { driverApi } from '@/api/driver';
import { ApiError } from '@/api/client';
import { queueStopCompletion } from '@/offline/syncQueue';

export function usePinVerification() {
  const {
    selectedRoute,
    activeOutlet,
    completeOutlet,
    replaceScreen,
    popScreen,
    returnTo,
    conditions,
    meterPhotos,
    setRouteVersion,
    track
  } = useStore();

  const [pin, setPin] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isWrong, setIsWrong] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(3);
  const [isLocked, setIsLocked] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const confirmation = activeOutlet?.confirmation;
  const isRejected = confirmation?.approvalStatus === 'rejected';
  const isExpired = confirmation?.expired;

  useEffect(() => {
    if (confirmation && !confirmation.locked && isLocked) {
      setIsLocked(false);
      setAttemptsLeft(3);
      setErrorMessage('');
      setPin('');
    }
  }, [confirmation, isLocked]);

  const handleBack = () => {
    track('P08');
    setPin('');
    popScreen();
  };

  const submitPin = async (enteredPin: string) => {
    if (!activeOutlet || !selectedRoute) return;
    setIsVerifying(true);
    setErrorMessage('');

    if (import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE !== 'true' && selectedRoute.apiId) {
      try {
        if (conditions.networkStatus === 'offline' || !navigator.onLine) {
          // No signal at the store: keep the PIN and delivery on the device. The server checks
          // the PIN when this syncs, against the PIN that was valid at the time it was entered.
          await queueStopCompletion({
            tripId: selectedRoute.apiId,
            stopId: activeOutlet.id,
            pin: enteredPin,
            includeArrival: activeOutlet.apiVersion === undefined,
            items: activeOutlet.products.map((product) => ({ sku: product.id, delivered: Number(product.quantity), short: 0, damaged: 0 })),
          });
          setIsVerifying(false);
          setIsOfflineSaved(true);
          completeOutlet(activeOutlet.id, true);
          track('P06');
          const isLastOutlet = selectedRoute.outlets.filter((outlet) => outlet.id !== activeOutlet.id).every((outlet) => outlet.status === 'completed');
          setTimeout(() => replaceScreen(isLastOutlet ? 'meter_photo_end' : returnTo === 'map' ? 'map' : 'dashboard'), 1500);
          return;
        }
        const result = await driverApi.completeStop(selectedRoute.apiId, activeOutlet.id, enteredPin, activeOutlet.products, activeOutlet.apiVersion, selectedRoute.version);
        setRouteVersion(selectedRoute.id, result.tripVersion);
        setIsVerifying(false);
        setIsSuccess(true);
        completeOutlet(activeOutlet.id, false);
        track('P05');
        const isLastOutlet = selectedRoute.outlets.filter((outlet) => outlet.id !== activeOutlet.id).every((outlet) => outlet.status === 'completed');
        setTimeout(() => replaceScreen(isLastOutlet ? 'meter_photo_end' : returnTo === 'map' ? 'map' : 'dashboard'), 1500);
        return;
      } catch (error) {
        setIsVerifying(false);
        const code = error instanceof ApiError ? error.code : '';
        if (code === 'PIN_INCORRECT') {
          const nextAttempts = attemptsLeft - 1;
          setAttemptsLeft(nextAttempts);
          setIsWrong(true);
          setErrorMessage(`Incorrect PIN. ${nextAttempts} ${nextAttempts === 1 ? 'attempt' : 'attempts'} left.`);
          setTimeout(() => { setIsWrong(false); setPin(''); }, 600);
        } else if (code === 'PIN_EXPIRED' || code === 'PIN_ATTEMPTS_EXCEEDED') {
          setIsLocked(true);
          setErrorMessage(code === 'PIN_EXPIRED' ? 'PIN expired. Ask the manager for a new PIN.' : 'Waiting for a new PIN');
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Delivery confirmation failed.');
          setPin('');
        }
        return;
      }
    }

    setTimeout(() => {
      setIsVerifying(false);

      if (enteredPin === '4821') {
        const isLastOutlet =
          selectedRoute.outlets[selectedRoute.outlets.length - 1]?.id === activeOutlet.id ||
          activeOutlet.visitOrder === selectedRoute.outlets.length ||
          selectedRoute.outlets.filter((o) => o.id !== activeOutlet.id).every((o) => o.status === 'completed');

        const onAdvance = () => {
          if (isLastOutlet) {
            if (meterPhotos[selectedRoute.id]?.end) {
              replaceScreen('shift_summary');
            } else {
              replaceScreen('meter_photo_end');
            }
          } else {
            replaceScreen(returnTo === 'map' ? 'map' : 'dashboard');
          }
        };

        if (conditions.nextPinResult === 'offline-saved' || conditions.networkStatus === 'offline') {
          setIsOfflineSaved(true);
          completeOutlet(activeOutlet.id, true);
          track('P06');
          setTimeout(onAdvance, 1500);
        } else {
          setIsSuccess(true);
          completeOutlet(activeOutlet.id, false);
          track('P05');
          setTimeout(onAdvance, 1500);
        }
      } else {
        const nextAttempts = attemptsLeft - 1;
        setAttemptsLeft(nextAttempts);

        if (nextAttempts <= 0) {
          setIsLocked(true);
          track('P04');
          setErrorMessage('Waiting for a new PIN');
        } else {
          setIsWrong(true);
          track('P03');
          setErrorMessage(`Incorrect PIN. ${nextAttempts} ${nextAttempts === 1 ? 'attempt' : 'attempts'} left.`);
          setTimeout(() => {
            setIsWrong(false);
            setPin('');
          }, 600);
        }
      }
    }, 800);
  };

  const handleDigitPress = (digit: string) => {
    if (isVerifying || isSuccess || isOfflineSaved || isLocked || isRejected || isExpired) return;

    track('P01');
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const nextPin = prev + digit;
      if (nextPin.length === 4) {
        track('P02');
        void submitPin(nextPin);
      }
      return nextPin;
    });
  };

  const handleDelete = () => {
    if (isVerifying || isSuccess || isOfflineSaved || isLocked) return;
    setPin((prev) => prev.slice(0, -1));
  };

  return {
    pin,
    isVerifying,
    isWrong,
    isSuccess,
    isOfflineSaved,
    isLocked,
    errorMessage,
    isRejected,
    isExpired,
    handleDigitPress,
    handleDelete,
    handleBack
  };
}
