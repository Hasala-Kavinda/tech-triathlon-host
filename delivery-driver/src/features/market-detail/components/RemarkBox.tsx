import React, { useState } from 'react';
import { driverApi } from '@/api/driver';

/** Lets the driver send a free-text remark about this stop to the dispatcher's review queue. */
export const RemarkBox: React.FC<{ tripId: string | undefined; outletId: string; onSent: (message: string) => void }> = ({ tripId, outletId, onSent }) => {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  if (!tripId) return null;

  const send = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try {
      await driverApi.raiseRemark(tripId, text.trim(), outletId);
      setText('');
      setOpen(false);
      onSent('Remark sent to the dispatcher');
    } catch (error) {
      onSent(error instanceof Error ? error.message : 'The remark could not be sent.');
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="w-full h-11 rounded-xl border border-hairline bg-surface text-[15px] font-semibold text-action cursor-pointer">
        Report a remark to dispatch
      </button>
    );
  }
  return (
    <section aria-label="Remark to dispatch" className="w-full bg-surface rounded-[20px] border border-hairline p-4 space-y-3">
      <label className="block text-[14px] font-semibold text-black dark:text-white" htmlFor="driver-remark">Remark for the dispatcher</label>
      <textarea id="driver-remark" value={text} onChange={(event) => setText(event.target.value)} maxLength={2000} rows={3} placeholder="What should the dispatcher know about this stop?" className="w-full rounded-xl border border-hairline bg-bg p-3 text-[15px]" />
      <div className="flex gap-2">
        <button type="button" onClick={send} disabled={busy || !text.trim()} className="flex-1 h-11 rounded-xl bg-action text-white text-[15px] font-semibold disabled:opacity-50 cursor-pointer">{busy ? 'Sending…' : 'Send remark'}</button>
        <button type="button" onClick={() => setOpen(false)} className="h-11 px-4 rounded-xl border border-hairline text-[15px] cursor-pointer">Cancel</button>
      </div>
    </section>
  );
};
