import { type ReactNode } from "react";

export function BottomActionBar({
  context,
  primaryAction,
  secondaryAction,
}: {
  context?: ReactNode
  primaryAction: ReactNode
  secondaryAction?: ReactNode
}) {
  return (
    <div className="bottom-action-bar">
      <div className="bottom-action-bar__inner">
        {context ? (
          <div className="bottom-action-bar__context">{context}</div>
        ) : null}
        <div className="bottom-action-bar__actions">
          {secondaryAction}
          {primaryAction}
        </div>
      </div>
    </div>
  )
}
