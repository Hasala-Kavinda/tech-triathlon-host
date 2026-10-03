// src/features/history/components/HistoryScreen.tsx - Order History and Delivery History from the server

import React, { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/state/store';
import { TopBar } from '@/shared/components/ui';
import { driverApi, type ApiDelivery, type ApiOrder } from '@/api/driver';

type Tab = 'orders' | 'deliveries';
type OrderRow = ApiOrder & { requestedDate?: string; createdAt?: string };

const OUTCOME_LABEL: Record<string, string> = {
  delivered: 'Delivered',
  partial: 'Partial delivery',
  refused: 'Refused',
  closed: 'Store closed',
  failed: 'Not delivered'
};

const when = (iso?: string) =>
  iso ? new Date(iso).toLocaleString([], { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—';

const label = (value?: string) => (value ? value.split('_').join(' ') : '—');

export const HistoryScreen: React.FC = () => {
  const { popScreen } = useStore();
  const [tab, setTab] = useState<Tab>('deliveries');
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [deliveries, setDeliveries] = useState<ApiDelivery[] | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async (which: Tab) => {
    setError('');
    try {
      if (which === 'orders') setOrders(await driverApi.orderHistory());
      else setDeliveries(await driverApi.deliveryHistory());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'History could not be loaded.');
    }
  }, []);

  useEffect(() => {
    if (tab === 'orders' && orders === null) void load('orders');
    if (tab === 'deliveries' && deliveries === null) void load('deliveries');
  }, [tab, orders, deliveries, load]);

  const rows = tab === 'orders' ? orders : deliveries;

  return (
    <div className="w-full h-full flex flex-col bg-bg relative overflow-hidden select-none">
      <TopBar title="History" showBackButton={true} onBack={popScreen} />

      <div role="tablist" aria-label="History" className="px-4 pt-2 flex gap-2">
        {(['deliveries', 'orders'] as Tab[]).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => setTab(value)}
            className={`h-10 px-4 rounded-full text-[15px] font-semibold border cursor-pointer ${
              tab === value ? 'bg-action text-white border-action' : 'bg-surface text-black dark:text-white border-hairline'
            }`}
          >
            {value === 'deliveries' ? 'Delivery History' : 'Order History'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-3 pb-8">
        {error && (
          <div role="alert" className="rounded-[14px] border border-critical/40 bg-critical/10 px-4 py-3 text-[14px]">
            {error}{' '}
            <button type="button" className="text-action font-semibold cursor-pointer" onClick={() => void load(tab)}>
              Try again
            </button>
          </div>
        )}

        {!error && rows === null && <p role="status" className="text-[15px] text-secondary text-center py-8">Loading…</p>}

        {!error && rows !== null && rows.length === 0 && (
          <p className="text-[15px] text-secondary text-center py-8">
            {tab === 'deliveries' ? 'No finished deliveries yet.' : 'No orders on your trips yet.'}
          </p>
        )}

        {tab === 'deliveries' && deliveries && deliveries.length > 0 && (
          <ul className="bg-surface rounded-[20px] border border-hairline divide-y divide-hairline overflow-hidden">
            {deliveries.map((delivery) => (
              <li key={delivery._id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[17px] font-medium text-black dark:text-white truncate">{delivery.outletId}</p>
                  <p className="text-[13px] text-secondary">
                    {OUTCOME_LABEL[delivery.outcome ?? ''] ?? label(delivery.status)}
                    {delivery.timingResult ? ` · ${delivery.timingResult === 'late' ? 'Late' : 'On time'}` : ''}
                  </p>
                </div>
                <span className="font-mono text-[13px] text-secondary tabular-nums shrink-0">{when(delivery.completedAt)}</span>
              </li>
            ))}
          </ul>
        )}

        {tab === 'orders' && orders && orders.length > 0 && (
          <ul className="bg-surface rounded-[20px] border border-hairline divide-y divide-hairline overflow-hidden">
            {orders.map((order) => (
              <li key={order._id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[17px] font-medium text-black dark:text-white truncate">{order.orderNumber ?? order._id}</p>
                  <p className="text-[13px] text-secondary">
                    {order.outletId} · {label(order.status)}
                  </p>
                </div>
                <span className="font-mono text-[13px] text-secondary tabular-nums shrink-0">{order.requestedDate ?? '—'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
