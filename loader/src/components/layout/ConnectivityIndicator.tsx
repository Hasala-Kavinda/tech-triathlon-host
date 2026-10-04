import { AlertTriangle, CheckCircle2, Circle, RefreshCw, type LucideIcon } from "lucide-react";
import { cx } from "../../lib/utils";
import type { ConnectivityState } from "../../types/loader";
import { Text } from "../ui/Text";

export const connectivityConfig: Record<ConnectivityState, {
  description: string
  icon: LucideIcon
  label: string
  tone: string
}> = {
  online: {
    description: "Connected to WayLink",
    icon: Circle,
    label: "Online",
    tone: "success",
  },
  offline: {
    description: "Not connected",
    icon: AlertTriangle,
    label: "Offline",
    tone: "warning",
  },
}
export function ConnectivityIndicator({
  compact = false,
  detail,
  state,
}: {
  compact?: boolean
  detail?: string
  state: ConnectivityState
}) {
  const config = connectivityConfig[state]
  const Icon = config.icon

  return (
    <div
      className={cx(
        "connectivity",
        `connectivity--${config.tone}`,
        compact && "connectivity--compact",
      )}
      role="status"
    >
      <div className="connectivity__icon">
        <Icon
          aria-hidden="true"
        />
      </div>
      <div className="connectivity__copy">
        <Text as="span" variant="label">
          {config.label}
        </Text>
        {compact && detail ? (
          <Text as="span" variant="caption">
            · {detail}
          </Text>
        ) : null}
        {!compact ? (
          <Text as="span" variant="caption">
            {config.description}
          </Text>
        ) : null}
      </div>
    </div>
  )
}
