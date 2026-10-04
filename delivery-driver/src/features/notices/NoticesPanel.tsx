import React, { useCallback, useEffect, useState } from 'react';
import { driverApi } from '@/api/driver';

const SEEN_KEY = 'waylink.driver.seenNotices';
const POLL_MS = 30_000;

function readSeen(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'); } catch { return []; }
}

type Notice = { id: string; tripId: string | null; remarkText: string; text: string; sentAt: string };

/** Dispatcher notices addressed to this driver (sent from the remark review). Polled; dismissed ones stay hidden on this phone. */
export const NoticesPanel: React.FC = () => {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [seen, setSeen] = useState<string[]>(readSeen);

  const load = useCallback(async () => {
    try { setNotices(await driverApi.notices()); } catch { /* offline: keep what is shown */ }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  const unseen = notices.filter((notice) => !seen.includes(notice.id));
  if (unseen.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...seen, id];
    setSeen(next);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(next)); } catch { /* private mode */ }
  };

  return (
    <section aria-label="Notices from dispatch" className="w-full space-y-2">
      {unseen.map((notice) => (
        <div key={notice.id} role="status" className="w-full rounded-[14px] border border-action/40 bg-action/10 px-4 py-3 text-[14px] leading-snug text-black dark:text-white">
          <strong className="font-semibold">Notice from dispatch</strong>
          <p className="mt-1 whitespace-pre-line">{notice.text}</p>
          <p className="mt-1 text-[12px] text-secondary">About: {notice.remarkText}</p>
          <button type="button" onClick={() => dismiss(notice.id)} className="mt-2 text-[13px] font-semibold text-action cursor-pointer">Got it</button>
        </div>
      ))}
    </section>
  );
};
