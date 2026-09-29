import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { MockApiService } from '../services/mockApi';

export interface SyncQueueItem {
  id: string;
  type: 'outlet_progress' | 'pin_submission' | 'route_start' | 'route_finish';
  payload: any;
  recordedAt: string;
  attempts: number;
}

const STORAGE_KEY = 'waylink.v1.syncQueue';

export interface SyncQueueContextType {
  queue: SyncQueueItem[];
  isSyncing: boolean;
  enqueue: (type: SyncQueueItem['type'], payload: any) => void;
  flushQueue: () => Promise<void>;
  clearQueue: () => void;
  pendingCount: number;
}

const SyncQueueContext = createContext<SyncQueueContextType | undefined>(undefined);

export const SyncQueueProvider: React.FC<{
  children: ReactNode;
  onItemSynced?: (item: SyncQueueItem) => void;
}> = ({ children, onItemSynced }) => {
  const [queue, setQueue] = useState<SyncQueueItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Discard and start clean if invalid
    }
    return [];
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  // Persist queue to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    } catch (err) {
      console.error('Failed to persist syncQueue:', err);
    }
  }, [queue]);

  const enqueue = useCallback((type: SyncQueueItem['type'], payload: any) => {
    const item: SyncQueueItem = {
      id: `ev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type,
      payload,
      recordedAt: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
      attempts: 0
    };
    setQueue((prev) => [...prev, item]);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  }, []);

  const flushQueue = useCallback(async () => {
    if (isSyncingRef.current || queue.length === 0) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const currentQueue = [...queue];
      const remaining: SyncQueueItem[] = [];

      for (const item of currentQueue) {
        if (item.attempts >= 3) {
          remaining.push(item);
          continue;
        }

        const res = await MockApiService.flushQueueItem(item);
        if (res.success) {
          // Notify subscriber that item synced
          if (onItemSynced) {
            onItemSynced(item);
          }
          // Delete sensitive PIN payload digits if any immediately per security rules
          if (item.type === 'pin_submission' && item.payload) {
            delete item.payload.pin;
          }
        } else {
          remaining.push({ ...item, attempts: item.attempts + 1 });
        }
      }

      setQueue(remaining);
    } catch (err) {
      console.error('Error during flushQueue:', err);
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [queue, onItemSynced]);

  // Auto-flush when online
  useEffect(() => {
    const handleOnline = () => {
      flushQueue();
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, [flushQueue]);

  return (
    <SyncQueueContext.Provider
      value={{
        queue,
        isSyncing,
        enqueue,
        flushQueue,
        clearQueue,
        pendingCount: queue.length
      }}
    >
      {children}
    </SyncQueueContext.Provider>
  );
};

const defaultSyncQueueContext: SyncQueueContextType = {
  queue: [],
  isSyncing: false,
  enqueue: () => {},
  flushQueue: async () => {},
  clearQueue: () => {},
  pendingCount: 0
};

export const useSyncQueue = (): SyncQueueContextType => {
  const ctx = useContext(SyncQueueContext);
  return ctx || defaultSyncQueueContext;
};
