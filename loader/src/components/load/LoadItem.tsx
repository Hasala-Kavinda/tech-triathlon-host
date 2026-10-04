import { Check, Flag, Package } from "lucide-react";
import { formatQuantity } from "../../lib/utils";
import type { LoadItemData } from "../../types/loader";
import { Button } from "../ui/Button";
import { StatusPill } from "../ui/StatusPill";
import { Text } from "../ui/Text";

export function LoadItem({
  item,
  onFlag,
  onMarkLoaded,
}: {
  item: LoadItemData
  onFlag: () => void
  onMarkLoaded: () => void
}) {
  return (
    <div className={`load-item load-item--${item.status}`}>
      <div className="load-item__product">
        <div className="load-item__icon" aria-hidden="true">
          <Package />
        </div>
        <div>
          <Text variant="body-strong">{item.name}</Text>
          <Text variant="data">{item.quantity}</Text>
        </div>
      </div>
      <div className="load-item__state">
        {item.status === "loaded" ? (
          <StatusPill variant="loaded" />
        ) : item.status === "flagged" ? (
          <div className="load-item__exception-state">
            <StatusPill
              variant="changed"
              label={
                item.exception?.pendingSync
                  ? "Flagged · Offline"
                  : "Flagged"
              }
            />
            <Text variant="caption">
              {item.exception
                ? `${formatQuantity(
                    item.exception.affectedQuantity,
                    item.exception.unit,
                  )} · ${item.exception.type.toUpperCase()}`
                : "Exception recorded"}
            </Text>
          </div>
        ) : (
          <StatusPill variant="normal" label="Pending" />
        )}
      </div>
      <div className="load-item__actions">
        {item.status === "pending" ? (
          <Button variant="primary" icon={Check} onClick={onMarkLoaded}>
            Mark loaded
          </Button>
        ) : null}
        <Button
          variant="secondary"
          icon={Flag}
          onClick={onFlag}
          aria-label={`${
            item.status === "flagged" ? "Review flag for" : "Flag"
          } ${item.name}`}
        >
          {item.status === "flagged" ? "Review flag" : "Flag"}
        </Button>
      </div>
    </div>
  )
}
