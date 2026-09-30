import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { MockApiService, CANONICAL_DRIVER } from '../services/mockApi';

export type ShiftStatus = 'offline' | 'online';
export type GpsStatus = 'on' | 'off' | 'requesting' | 'blocked' | 'unavailable';
export type NetworkStatus = 'good' | 'fair' | 'weak' | 'offline';

export interface DriverPosition {
  lat: number;
  lng: number;
  accuracyMeters: number;
}

export interface DriverState {
  driverId: string;
  name: string;
  vehicleType: string;
  plateNumber: string;
  session: {
    signedIn: boolean;
  };
  gpsStatus: GpsStatus;
  driverPosition: DriverPosition | null;
  networkStatus: NetworkStatus;
}

export interface DriverDataUpdate extends Partial<DriverState> {
  vehicleInfo?: string;
  shiftStatus?: ShiftStatus;
}

export interface DriverContextType extends DriverState {
  // Backward compatibility fields
  vehicleInfo: string;
  shiftStatus: ShiftStatus;
  depot: string;
  batteryNominal: string;
  // Named actions
  signIn: (phone: string, otp: string) => Promise<boolean>;
  endShift: () => Promise<boolean>;
  setGpsStatus: (status: GpsStatus) => void;
  setDriverPosition: (pos: DriverPosition | null) => void;
  setNetworkStatus: (status: NetworkStatus) => void;
  requestGps: () => void;
  // Legacy helpers
  goOnline: () => void;
  goOffline: () => void;
  toggleShiftStatus: () => void;
  setDriverData: (data: DriverDataUpdate) => void;
}

const STORAGE_KEY = 'waylink.v1.driver';

// Default initial driver position: ~1.2 km south-west of Kandy center (7.2820, 80.6270)
export const DEFAULT_MOCK_DRIVER_POSITION: DriverPosition = {
  lat: 7.2820,
  lng: 80.6270,
  accuracyMeters: 12
};

const getInitialNetworkStatus = (): NetworkStatus => {
  if (typeof window !== 'undefined') {
    const search = new URLSearchParams(window.location.search);
    if (search.get('dev') === 'offline') return 'offline';
    if (search.get('dev') === 'weak') return 'weak';
    if (!navigator.onLine) return 'offline';
  }
  return 'good';
};

const getInitialGpsStatus = (): GpsStatus => {
  if (typeof window !== 'undefined') {
    const search = new URLSearchParams(window.location.search);
    if (search.get('dev') === 'weakGps') return 'requesting';
    if (search.get('dev') === 'gpsOff') return 'off';
  }
  return 'on';
};

const loadPersistedDriver = (): Partial<DriverState> | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && typeof parsed.driverId === 'string' && parsed.session && typeof parsed.session.signedIn === 'boolean') {
        return parsed;
      }
    }
  } catch {
    // Discard corrupted data
  }
  return null;
};

const DriverContext = createContext<DriverContextType | undefined>(undefined);

export const DriverProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const persisted = loadPersistedDriver();

  const [driverId, setDriverId] = useState(persisted?.driverId || CANONICAL_DRIVER.driverId);
  const [name, setName] = useState(persisted?.name || CANONICAL_DRIVER.name);
  const [vehicleType, setVehicleType] = useState(persisted?.vehicleType || CANONICAL_DRIVER.vehicleType);
  const [plateNumber, setPlateNumber] = useState(persisted?.plateNumber || CANONICAL_DRIVER.plateNumber);
  const [session, setSession] = useState(
    persisted?.session ? { ...persisted.session, signedIn: true } : { signedIn: true }
  );
  const [gpsStatus, setGpsStatusState] = useState<GpsStatus>(persisted?.gpsStatus || getInitialGpsStatus());
  const [driverPosition, setDriverPositionState] = useState<DriverPosition | null>(
    (persisted?.gpsStatus || getInitialGpsStatus()) === 'on' ? DEFAULT_MOCK_DRIVER_POSITION : null
  );
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>(getInitialNetworkStatus());

  // Persist driverContext (WITHOUT position per spec section 7)
  useEffect(() => {
    try {
      const toSave = {
        driverId,
        name,
        vehicleType,
        plateNumber,
        session,
        gpsStatus
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    } catch (err) {
      console.error('Failed to persist driver context:', err);
    }
  }, [driverId, name, vehicleType, plateNumber, session, gpsStatus]);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      const search = new URLSearchParams(window.location.search);
      if (search.get('dev') !== 'offline') {
        setNetworkStatus('good');
      }
    };
    const handleOffline = () => {
      setNetworkStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const setGpsStatus = useCallback((status: GpsStatus) => {
    setGpsStatusState(status);
    if (status === 'on') {
      setDriverPositionState((prev) => prev || DEFAULT_MOCK_DRIVER_POSITION);
    } else {
      setDriverPositionState(null);
    }
  }, []);

  const setDriverPosition = useCallback((pos: DriverPosition | null) => {
    setDriverPositionState(pos);
  }, []);

  const requestGps = useCallback(() => {
    setGpsStatusState('requesting');
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGpsStatusState('on');
          setDriverPositionState({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracyMeters: Math.round(pos.coords.accuracy)
          });
        },
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            setGpsStatusState('blocked');
          } else {
            setGpsStatusState('unavailable');
          }
          setDriverPositionState(null);
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    } else {
      setGpsStatusState('unavailable');
    }
  }, []);

  const signIn = useCallback(async (phone: string, otp: string): Promise<boolean> => {
    try {
      const profile = await MockApiService.signIn(phone, otp);
      setDriverId(profile.driverId);
      setName(profile.name);
      setVehicleType(profile.vehicleType);
      setPlateNumber(profile.plateNumber);
      setSession({ signedIn: true });
      return true;
    } catch {
      return false;
    }
  }, []);

  const endShift = useCallback(async (): Promise<boolean> => {
    // Clears driver session
    setSession({ signedIn: false });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
    return true;
  }, []);

  // Backward compatibility methods
  const vehicleInfo = `${vehicleType} · ${plateNumber}`;
  const shiftStatus: ShiftStatus = session.signedIn ? 'online' : 'offline';
  const depot = 'North Hub (Peliyagoda Depot)';
  const batteryNominal = '94% Nominal';

  const goOnline = useCallback(() => {
    setSession({ signedIn: true });
  }, []);

  const goOffline = useCallback(() => {
    setSession({ signedIn: false });
  }, []);

  const toggleShiftStatus = useCallback(() => {
    setSession((prev) => ({ signedIn: !prev.signedIn }));
  }, []);

  const setDriverData = useCallback((data: Partial<DriverState>) => {
    if (data.driverId) setDriverId(data.driverId);
    if (data.name) setName(data.name);
    if (data.vehicleType) setVehicleType(data.vehicleType);
    if (data.plateNumber) setPlateNumber(data.plateNumber);
    if (data.session) setSession(data.session);
    if (data.gpsStatus) setGpsStatusState(data.gpsStatus);
    if (data.driverPosition !== undefined) setDriverPositionState(data.driverPosition);
    if (data.networkStatus) setNetworkStatus(data.networkStatus);
  }, []);

  return (
    <DriverContext
      value={{
        driverId,
        name,
        vehicleType,
        plateNumber,
        session,
        gpsStatus,
        driverPosition,
        networkStatus,
        vehicleInfo,
        shiftStatus,
        depot,
        batteryNominal,
        signIn,
        endShift,
        setGpsStatus,
        setDriverPosition,
        setNetworkStatus,
        requestGps,
        goOnline,
        goOffline,
        toggleShiftStatus,
        setDriverData
      }}
    >
      {children}
    </DriverContext>
  );
};

export const useDriver = (): DriverContextType => {
  const ctx = useContext(DriverContext);
  if (!ctx) throw new Error('useDriver must be used within DriverProvider');
  return ctx;
};
