import { useEffect, useState } from "react";
import type { LoadTiming } from "../../data/mock-data";
import { Text } from "../ui/Text";
import { CompletionVarianceBadge } from "./CompletionVarianceBadge";

export function LoadDepartureTimer({ timing }: { timing: LoadTiming }) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (timing.finalVariance !== undefined) return

    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timing.finalVariance])

  if (timing.finalVariance !== undefined) {
    return (
      <div className="load-departure-timer load-departure-timer--completed">
        <Text variant="caption">COMPLETED</Text>
        <CompletionVarianceBadge finalVariance={timing.finalVariance} />
      </div>
    )
  }

  const diff = timing.departureAt - now
  const isPast = diff < 0
  const absDiff = Math.abs(diff)
  const m = Math.floor(absDiff / 60000)
  const s = Math.floor((absDiff % 60000) / 1000)
  const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`

  return (
    <div className="load-departure-timer">
      <Text variant="caption">TIME LEFT</Text>
      <Text variant="data" className={isPast ? "text-critical" : ""}>
        {isPast ? `-${formatted}` : formatted}
      </Text>
    </div>
  )
}
