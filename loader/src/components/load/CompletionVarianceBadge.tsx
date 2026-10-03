import { AlertTriangle } from "lucide-react";
import { cx } from "../../lib/utils";

export function CompletionVarianceBadge({ finalVariance }: { finalVariance: number }) {
  const isEarly = finalVariance >= 0
  const absVariance = Math.abs(finalVariance)
  const m = Math.floor(absVariance / 60000)
  const s = Math.floor((absVariance % 60000) / 1000)
  const formatted = `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  const sign = isEarly ? "+" : "-"
  
  const tone = isEarly ? "success" : "critical"

  return (
    <span className={cx("status-pill", `status-pill--${tone}`)}>
      {isEarly ? (
        <span aria-hidden="true" className="lucide">✓</span>
      ) : (
        <AlertTriangle aria-hidden="true" />
      )}
      <span>{sign}{formatted}</span>
    </span>
  )
}
