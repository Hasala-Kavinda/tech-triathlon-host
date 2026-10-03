import { AlertCircle, Bolt } from "lucide-react";
import { Button, ShopTag } from "../../components/ui";
import type { Order, Vehicle } from "../../types/dispatcher";
import { orderRowOpenProps } from "./helpers";

export function OrderRow({
  order,
  selectedVehicle,
  added,
  toggleAdded,
  aiSuggested,
  highlighted,
  datePreset,
}: {
  order: Order
  selectedVehicle: Vehicle | null
  added: boolean
  toggleAdded: (id: string) => void
  aiSuggested?: boolean
  highlighted?: boolean
  datePreset?: string
}) {
  const isDuePresetDay = datePreset && order.dueDay === 28

  return (
    <div
      className={`order-row ${order.emergency ? "order-row--emergency" : ""} ${selectedVehicle && !order.inReach ? "order-row--disabled" : ""
        } ${highlighted ? "order-row--highlighted" : ""} order-row--clickable`}
      {...orderRowOpenProps(order)}
    >
      {order.emergency ? (
        <AlertCircle
          className="order-row__alert"
          aria-hidden="true"
          size={26}
        />
      ) : (
        <span className="order-row__alert-space" />
      )}
      <div className="order-row__content">
        <div className="order-row__line">
          <span className="data-text">{order.id}</span>
          <ShopTag type={order.type} />
          {isDuePresetDay ? (
            <span
              style={{
                padding: "2px 8px",
                borderRadius: "999px",
                background: "var(--sunburst-100)",
                color: "var(--sunburst-900)",
                fontWeight: 700,
                fontSize: "11px",
              }}
            >
              Due Mon 28
            </span>
          ) : null}
          {selectedVehicle && (aiSuggested ?? order.suggested) ? (
            <Bolt
              className="suggestion-star"
              aria-label="Suggested order"
              size={20}
            />
          ) : null}
          <strong className="order-row__kg">{order.kg} kg</strong>
          {selectedVehicle ? (
            order.inReach ? (
              <Button
                className="order-row__action"
                onClick={() => toggleAdded(order.id)}
                variant={added ? "primary" : "secondary"}
              >
                {added ? "✓ Added" : "+ Add"}
              </Button>
            ) : (
              <span className="out-of-reach">Out of reach</span>
            )
          ) : null}
        </div>
        <span className="order-row__meta">
          {order.shop} · {order.town} · {order.items}
        </span>
      </div>
    </div>
  )
}
