import { AlertTriangle, Check, CheckCircle2, Circle, Clock3, CloudOff, Hammer, LoaderCircle, ShieldCheck, XCircle, type LucideIcon } from "lucide-react";
import { cx } from "../../lib/utils";

export type StatusVariant = "online" | "loaded" | "missing" | "damaged" | "offline" | "in-progress" | "synced" | "changed" | "normal" | "urgent"
export const statusConfig: Record<StatusVariant, {
  icon: LucideIcon
  label: string
  tone: string
}> = {
  online: { icon: Circle, label: "Online", tone: "success" },
  loaded: { icon: CheckCircle2, label: "Loaded", tone: "success" },
  missing: { icon: XCircle, label: "Missing", tone: "critical" },
  damaged: { icon: Hammer, label: "Damaged", tone: "warning" },
  offline: { icon: CloudOff, label: "Offline", tone: "warning" },
  "in-progress": {
    icon: LoaderCircle,
    label: "In progress",
    tone: "action",
  },
  synced: { icon: ShieldCheck, label: "Synced", tone: "success" },
  changed: { icon: AlertTriangle, label: "Changed", tone: "warning" },
  normal: { icon: Check, label: "Normal", tone: "neutral" },
  urgent: { icon: Clock3, label: "Urgent", tone: "warning" },
}
export function StatusPill({
  label,
  variant,
}: {
  label?: string
  variant: StatusVariant
}) {
  const config = statusConfig[variant]
  const Icon = config.icon

  return (
    <span className={cx("status-pill", `status-pill--${config.tone}`)}>
      <Icon aria-hidden="true" />
      <span>{label ?? config.label}</span>
    </span>
  )
}
