import { useState, useEffect } from "react";
import { calendarApi } from "../api/store";

export function useCutoff() {
  const [cutoffDeadlineAt, setCutoffDeadlineAt] = useState<string | null>(null);
  const [isClosed, setIsClosed] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [targetDeliveryStr, setTargetDeliveryStr] = useState<string>("Tomorrow");
  const [targetDeliveryDate, setTargetDeliveryDate] = useState<string | null>(null);

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
      
      // Filter future operating days
      const futureOperatingDays = rangeData.filter(d => d.date > localISOTime && d.isOperating);
      
      let targetDate = "";
      if (futureOperatingDays.length > 0) {
        if (pastCutoff && futureOperatingDays.length > 1) {
          targetDate = futureOperatingDays[1].date;
        } else {
          targetDate = futureOperatingDays[0].date;
        }
      }
      
      setTargetDeliveryDate(targetDate || null);

      if (pastCutoff) {
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

  return { isClosed, timeRemaining, targetDeliveryStr, targetDeliveryDate };
}