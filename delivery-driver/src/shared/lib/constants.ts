// src/shared/lib/constants.ts - Global app constants

export const LOGIN_URL: string =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_LOGIN_URL) ||
  'https://tech-triathlon-login.vercel.app/';

export const CANONICAL_DRIVER = {
  driverId: '8821',
  name: 'Marcus Vance',
  vehicleType: 'Isuzu ELF',
  plateNumber: 'LK-4821'
};
