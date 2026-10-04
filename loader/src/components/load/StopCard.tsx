import { Clock3, PackageCheck, Store } from "lucide-react";
import type { LoadItemData } from "../../types/loader";
import { StatusPill } from "../ui/StatusPill";
import { Text } from "../ui/Text";
import { LoadItem } from "./LoadItem";

export function StopCard({
  deliveryWindow,
  isActive,
  isComplete,
  items,
  onFlagItem,
  onMarkLoaded,
  orderIds,
  outlet,
  stopNumber,
}: {
  deliveryWindow: string
  isActive: boolean
  isComplete: boolean
  items: LoadItemData[]
  onFlagItem: (itemId: string) => void
  onMarkLoaded: (itemId: string) => void
  orderIds: string[]
  outlet: string
  stopNumber: number
}) {
  const accountedItems = items.filter(
    (item) => item.status !== "pending",
  ).length
  const loadedItems = items.filter((item) => item.status === "loaded").length
  const flaggedItems = items.filter((item) => item.status === "flagged").length

  return (
    <section
      className={`stop-card ${isActive ? "stop-card--active" : ""} ${
        isComplete ? "stop-card--complete" : ""
      }`}
      id={`stop-${stopNumber}`}
      aria-labelledby={`stop-${stopNumber}-title`}
    >
      <div className="stop-card__header">
        <div className="stop-card__number" aria-hidden="true">
          <Text as="span" variant="caption">
            Stop
          </Text>
          <Text as="span" variant="data">
            {String(stopNumber).padStart(2, "0")}
          </Text>
        </div>
        <div className="stop-card__outlet">
          <div className="stop-card__title-row">
            <Text as="h2" variant="h2" className="stop-card__title">
              <span id={`stop-${stopNumber}-title`}>{outlet}</span>
            </Text>
            {isComplete ? (
              <StatusPill variant="loaded" label="Stop accounted" />
            ) : isActive ? (
              <StatusPill variant="in-progress" label="Next to load" />
            ) : null}
          </div>
          <div className="stop-card__meta">
            <span>
              <Clock3 aria-hidden="true" />
              <Text as="span" variant="label">
                Delivery · {deliveryWindow}
              </Text>
            </span>
            <span>
              <PackageCheck aria-hidden="true" />
              <Text as="span" variant="label">
                {accountedItems}/{items.length} accounted
              </Text>
            </span>
            <Text as="span" variant="caption" className="stop-card__breakdown">
              {loadedItems} loaded · {flaggedItems} flagged
            </Text>
          </div>
        </div>
      </div>
      <div className="stop-card__order">
        <div className="stop-card__order-heading">
          <Store aria-hidden="true" />
          <div>
            <Text variant="caption">Order</Text>
            <Text variant="data">{orderIds.map(id => `#${id}`).join(", ")}</Text>
          </div>
        </div>
        <Text variant="caption">
          {items.length} {items.length === 1 ? "item" : "items"}
        </Text>
      </div>
      <div className="stop-card__items">
        {items.map((item) => (
          <LoadItem
            item={item}
            key={item.id}
            onFlag={() => onFlagItem(item.id)}
            onMarkLoaded={() => onMarkLoaded(item.id)}
          />
        ))}
      </div>
    </section>
  )
}
