import { useState, useEffect } from "react";
import { calendarApi } from "../api/store";
import { offeredDeliveryDates } from "../lib/deliveryDates";

export function useCutoff() {
  const [cutoffDeadlineAt, setCutoffDeadlineAt] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [targetDeliveryStr, setTargetDeliveryStr] = useState<string>("Tomorrow");
  const [targetDeliveryDate, setTargetDeliveryDate] = useState<string | null>(null);
  const [futureOperatingDays, setFutureOperatingDays] = useState<{ date: string; isOperating: boolean }[]>([]);
  const [devMode, setDevMode] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    let active = true;
    const today = new Date();
    const tzOffset = today.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(today.getTime() - tzOffset)).toISOString().split("T")[0];
    
    // Fetch 14 days to find the next operating days
    const next14Days = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);
    const toISOTime = (new Date(next14Days.getTime() - tzOffset)).toISOString().split("T")[0];

    Promise.all([
      calendarApi.getDay(localISOTime),
      calendarApi.getRange(localISOTime, toISOTime)
    ]).then(([dayData, rangeData]) => {
      if (!active) return;
      setCutoffDeadlineAt(dayData.cutoffDeadlineAt);
      
      const now = new Date().getTime();
      const cutoff = new Date(dayData.cutoffDeadlineAt).getTime();
      const pastCutoff = now >= cutoff;
      
      // Production: upcoming operating days only. Development (server DEV_MODE): today and every day are offered.
      const isDev = Boolean(dayData.devMode);
      const { days, defaultDate } = offeredDeliveryDates({ range: rangeData, today: localISOTime, pastCutoff, devMode: isDev });
      const targetDate = defaultDate ?? "";

      setDevMode(isDev);
      setToday(localISOTime);
      setFutureOperatingDays(days);
      setTargetDeliveryDate(targetDate || null);

      if (isDev) {
        setTargetDeliveryStr(`Today (${targetDate}) · development mode`);
      } else if (pastCutoff) {
        setTargetDeliveryStr(targetDate ? `Following planning run (${targetDate})` : "Following planning run"); 
      } else {
        setTargetDeliveryStr(targetDate ? `Tomorrow (${targetDate})` : "Tomorrow");
      }
    }).catch(console.error);
    
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!cutoffDeadlineAt) return;
    const target = new Date(cutoffDeadlineAt).getTime();
    
    const update = () => {
      const now = new Date().getTime();
      if (now >= target) {
        setIsClosed(true);
        setTimeRemaining("");
      } else {
        setIsClosed(false);
        const diff = target - now;
        const h = Math.floor(diff / (1000 * 60 * 60));
        const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        setTimeRemaining(`${h}h ${m}m`);
      }
    };
    
    update();
    const timer = setInterval(update, 60000);
    return () => clearInterval(timer);
  }, [cutoffDeadlineAt]);

  return { isClosed, timeRemaining, targetDeliveryStr, targetDeliveryDate, cutoffDeadlineAt, futureOperatingDays, devMode, today };
}