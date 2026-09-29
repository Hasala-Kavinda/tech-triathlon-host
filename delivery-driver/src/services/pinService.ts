export const PIN_LENGTH = 4;
export const VALID_MOCK_PIN = '4821';

export type PinVerificationResult = 'ok' | 'wrong' | 'locked' | 'expired' | 'queued';

export interface VerifyPinOptions {
  isOffline?: boolean;
  isLocked?: boolean;
  isExpired?: boolean;
  attemptsLeft?: number;
}

/**
 * Mock verification service for delivery PIN.
 * The valid PIN (4821) is verified securely and never rendered anywhere in the UI.
 * Returns:
 * - 'ok': valid PIN
 * - 'wrong': invalid PIN
 * - 'locked': max attempts exceeded
 * - 'expired': PIN timed out
 * - 'queued': driver is offline and PIN is saved locally for background sync
 */
export const verifyPin = async (
  _outletId: string,
  pin: string,
  options: VerifyPinOptions = {}
): Promise<{ result: PinVerificationResult; attemptsLeft: number }> => {
  // Simulate network latency (max about 1.5s as per mock spec)
  await new Promise((resolve) => setTimeout(resolve, 600));

  if (options.isOffline) {
    return { result: 'queued', attemptsLeft: options.attemptsLeft ?? 3 };
  }

  if (options.isLocked) {
    return { result: 'locked', attemptsLeft: 0 };
  }

  if (options.isExpired) {
    return { result: 'expired', attemptsLeft: options.attemptsLeft ?? 3 };
  }

  if (pin === VALID_MOCK_PIN) {
    return { result: 'ok', attemptsLeft: options.attemptsLeft ?? 3 };
  }

  const remaining = Math.max(0, (options.attemptsLeft ?? 3) - 1);
  if (remaining === 0) {
    return { result: 'locked', attemptsLeft: 0 };
  }

  return { result: 'wrong', attemptsLeft: remaining };
};
