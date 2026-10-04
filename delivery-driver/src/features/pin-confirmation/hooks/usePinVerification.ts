// src/features/pin-confirmation/hooks/usePinVerification.ts - Finishing a stop: the outcome, the store's PIN, online or queued offline

import { useState, useEffect } from 'react';
import { useStore } from '@/state/store';
import { driverApi, outcomeNeedsPin } from '@/api/driver';
import { ApiError } from '@/api/client';
import { itemsOf, undeliveredItemsOf } from '@/state/slices/routesSlice';
import { queueStopCompletion } from '@/offline/syncQueue';
import type { StopOutcome } from '@/shared/types';

const PROTOTYPE = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === 'true';

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
    showToast,
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

  // Units reported short or damaged make this a partial delivery.
  const hasIssues = !!activeOutlet?.products.some((product) => (product.short ?? 0) + (product.damaged ?? 0) > 0);
  const [chosenOutcome, setChosenOutcome] = useState<StopOutcome>(hasIssues ? 'partial' : 'delivered');
  const outcome: StopOutcome = hasIssues && chosenOutcome === 'delivered' ? 'partial' : chosenOutcome;
  const needsPin = outcomeNeedsPin(outcome);

  const setOutcome = (next: StopOutcome) => {
    if (next === 'delivered' && hasIssues) {
      showToast('Items were reported short or damaged, so this is a partial delivery.');
      return;
    }
    setChosenOutcome(next);
    setPin('');
    setErrorMessage('');
  };

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

  const goToNextScreen = () => {
    if (!activeOutlet || !selectedRoute) return;
    const isLastOutlet = selectedRoute.outlets.filter((outlet) => outlet.id !== activeOutlet.id).every((outlet) => outlet.status === 'completed');
    replaceScreen(isLastOutlet ? 'meter_photo_end' : returnTo === 'map' ? 'map' : 'dashboard');
  };

  /**
   * Finish the stop with the chosen outcome. Online it goes straight to the server (items, PIN,
   * outcome); offline it is kept on the phone and replayed in order when the network returns.
   */
  const finishStop = async (enteredPin?: string) => {
    if (!activeOutlet || !selectedRoute) return;
    const tripId = selectedRoute.apiId;
    const items = needsPin ? itemsOf(activeOutlet.products) : undeliveredItemsOf(activeOutlet.products);
    setIsVerifying(true);
    setErrorMessage('');
    try {
      if (!tripId) throw new Error('This route is not connected to the server.');
      if (conditions.networkStatus === 'offline' || !navigator.onLine) {
        // No signal at the store: keep the outcome (and PIN) on the device. The server checks the PIN
        // when this syncs, against the PIN that was valid at the time it was entered.
        await queueStopCompletion({
          tripId,
          stopId: activeOutlet.id,
          outcome,
          items,
          ...(needsPin && enteredPin ? { pin: enteredPin } : {}),
          includeArrival: !activeOutlet.arrived,
          ...(activeOutlet.arrivedAt ? { arrivedAt: new Date(activeOutlet.arrivedAt) } : {})
        });
        setIsVerifying(false);
        setIsOfflineSaved(true);
        completeOutlet(activeOutlet.id, true, outcome);
        track('P06');
        setTimeout(goToNextScreen, 1500);
        return;
      }

      let deliveryVersion = activeOutlet.apiVersion;
      if (deliveryVersion === undefined) {
        // Arrival was recorded on the phone while offline; record it (again) now that there is a connection.
        const arrived = await driverApi.arriveStop(tripId, activeOutlet.id, activeOutlet.arrivedAt ? new Date(activeOutlet.arrivedAt) : new Date());
        deliveryVersion = arrived.delivery.version;
        setRouteVersion(selectedRoute.id, arrived.tripVersion);
      }
      await driverApi.finishStop(tripId, activeOutlet.id, { outcome, deliveryVersion, items, ...(needsPin && enteredPin ? { pin: enteredPin } : {}) });
      setIsVerifying(false);
      setIsSuccess(true);
      completeOutlet(activeOutlet.id, false, outcome);
      track('P05');
      setTimeout(goToNextScreen, 1500);
    } catch (error) {
      setIsVerifying(false);
      const code = error instanceof ApiError ? error.code : '';
      if (code === 'PIN_INCORRECT') {
        // The server counts the attempts; show what it says is left.
        const fromServer = error instanceof ApiError ? (error.details as { attemptsLeft?: number } | undefined)?.attemptsLeft : undefined;
        const left = fromServer ?? attemptsLeft - 1;
        setAttemptsLeft(left);
        setIsWrong(true);
        setErrorMessage(`Incorrect PIN. ${left} ${left === 1 ? 'attempt' : 'attempts'} left.`);
        setTimeout(() => { setIsWrong(false); setPin(''); }, 600);
      } else if (code === 'PIN_EXPIRED' || code === 'PIN_ATTEMPTS_EXCEEDED') {
        setIsLocked(true);
        setErrorMessage(code === 'PIN_EXPIRED' ? 'PIN expired. Ask the manager for a new PIN.' : 'Waiting for a new PIN');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Delivery confirmation failed.');
        setPin('');
      }
    }
  };

  // Prototype-only path (no server): the demo PIN.
  const submitPrototypePin = (enteredPin: string) => {
    if (!activeOutlet || !selectedRoute) return;
    setIsVerifying(true);
    setTimeout(() => {
      setIsVerifying(false);
      if (enteredPin === '4821') {
        const offline = conditions.nextPinResult === 'offline-saved' || conditions.networkStatus === 'offline';
        if (offline) setIsOfflineSaved(true); else setIsSuccess(true);
        completeOutlet(activeOutlet.id, offline, outcome);
        setTimeout(() => {
          const isLastOutlet = selectedRoute.outlets.filter((o) => o.id !== activeOutlet.id).every((o) => o.status === 'completed');
          if (isLastOutlet) replaceScreen(meterPhotos[selectedRoute.id]?.end ? 'shift_summary' : 'meter_photo_end');
          else replaceScreen(returnTo === 'map' ? 'map' : 'dashboard');
        }, 1500);
      } else {
        const next = attemptsLeft - 1;
        setAttemptsLeft(next);
        if (next <= 0) { setIsLocked(true); setErrorMessage('Waiting for a new PIN'); }
        else { setIsWrong(true); setErrorMessage(`Incorrect PIN. ${next} ${next === 1 ? 'attempt' : 'attempts'} left.`); setTimeout(() => { setIsWrong(false); setPin(''); }, 600); }
      }
    }, 800);
  };

  const submitPin = (enteredPin: string) => {
    if (!activeOutlet || !selectedRoute) return;
    if (PROTOTYPE || !selectedRoute.apiId) submitPrototypePin(enteredPin);
    else void finishStop(enteredPin);
  };

  // Refused and closed stops end without a PIN: there may be nobody to give one.
  const completeWithoutPin = () => {
    if (needsPin || isVerifying) return;
    if (PROTOTYPE || !selectedRoute?.apiId) {
      if (!activeOutlet || !selectedRoute) return;
      completeOutlet(activeOutlet.id, false, outcome);
      goToNextScreen();
      return;
    }
    void finishStop();
  };

  const handleDigitPress = (digit: string) => {
    if (!needsPin || isVerifying || isSuccess || isOfflineSaved || isLocked || isRejected || isExpired) return;

    track('P01');
    setPin((prev) => {
      if (prev.length >= 4) return prev;
      const nextPin = prev + digit;
      if (nextPin.length === 4) {
        track('P02');
        submitPin(nextPin);
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
    outcome,
    setOutcome,
    needsPin,
    hasIssues,
    completeWithoutPin,
    handleDigitPress,
    handleDelete,
    handleBack
  };
}
