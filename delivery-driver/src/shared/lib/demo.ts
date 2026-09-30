// src/shared/lib/demo.ts - Demo mode detection helper

/**
 * Returns true if the URL query string contains ?demo=1.
 * Controls the visibility of prototype switchers, debug helpers, and test hints.
 */
export const isDemoMode = (): boolean => {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    return params.get('demo') === '1';
  } catch {
    return false;
  }
};
