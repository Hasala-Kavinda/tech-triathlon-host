import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';
import { apiRequest } from '../api/client';
import { clearMutations, deleteMutation, listMutations, putMutation, type StoredMutation } from '../offline/db';

export interface SyncQueueItem {
  id: string;
  type: 'outlet_progress' | 'pin_submission' | 'route_start' | 'route_finish';
  payload: Record<string, unknown>;
  recordedAt: string;
  attempts: number;
}

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
  const [queue, setQueue] = useState<SyncQueueItem[]>([]);

  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    void listMutations().then((items) => setQueue(items)).catch((error) => console.error('Failed to restore IndexedDB sync queue:', error));
  }, []);

  const enqueue = useCallback((type: SyncQueueItem['type'], payload: any) => {
    const item: StoredMutation = {
      id: crypto.randomUUID(),
      type,
      payload,
      recordedAt: new Date().toISOString(),
      attempts: 0,
      state: 'pending'
    };
    setQueue((prev) => [...prev, item]);
    void putMutation(item);
  }, []);

  const clearQueue = useCallback(() => {
    setQueue([]);
    void clearMutations();
  }, []);

  const flushQueue = useCallback(async () => {
    if (isSyncingRef.current || queue.length === 0) return;
    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      const currentQueue = [...queue];
      const remaining: SyncQueueItem[] = [];

      const mutations = currentQueue.filter((item) => item.attempts < 3).map((item) => ({
        clientMutationId: item.id,
        entityType: String(item.payload.entityType ?? 'trip'),
        entityId: String(item.payload.tripId ?? item.payload.routeId ?? 'unknown'),
        operation: item.type,
        baseVersion: Number(item.payload.baseVersion ?? 0),
        clientRecordedAt: item.recordedAt,
        payload: item.payload,
      }));
      const deviceId = localStorage.getItem('waylink.deviceId') ?? crypto.randomUUID();
      localStorage.setItem('waylink.deviceId', deviceId);
      const batch = await apiRequest<{ results: Array<{ clientMutationId: string; result: 'applied' | 'duplicate' | 'conflict' | 'rejected' }> }>("/sync/batch", { method: 'POST', body: JSON.stringify({ deviceId, mutations }) });

      for (const item of currentQueue) {
        if (item.attempts >= 3) {
          remaining.push(item);
          continue;
        }
        const result = batch.results.find((candidate) => candidate.clientMutationId === item.id);
        if (result?.result === 'applied' || result?.result === 'duplicate') {
          // Notify subscriber that item synced
          if (onItemSynced) {
            onItemSynced(item);
          }
          await deleteMutation(item.id);
        } else {
          const updated: StoredMutation = { ...item, attempts: item.attempts + 1, state: result?.result === 'conflict' ? 'conflict' : result?.result === 'rejected' ? 'rejected' : 'pending' };
          remaining.push(updated);
          await putMutation(updated);
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
    <SyncQueueContext
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
    </SyncQueueContext>
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
