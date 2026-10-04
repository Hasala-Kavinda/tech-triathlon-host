import { AlertCircle, Bolt } from "lucide-react";
import { Button, ShopTag } from "../../components/ui";
import type { Violation } from "@route-engine";
import { reasonLabel, reasonText } from "../../lib/routeEngine";
import type { Order, Vehicle } from "../../types/dispatcher";
import { orderRowOpenProps } from "./helpers";

export function OrderRow({
  order,
  selectedVehicle,
  added,
  toggleAdded,
  aiSuggested,
  highlighted,
  eligibility,
}: {
  order: Order
  selectedVehicle: Vehicle | null
  added: boolean
  toggleAdded: (id: string) => void
  aiSuggested?: boolean
  highlighted?: boolean
  /** The engine's verdict for this order on the selected vehicle (absent until a vehicle is picked). */
  eligibility?: { eligible: boolean; reasons: Violation[] }
}) {
  const outOfReach = Boolean(selectedVehicle && eligibility && !eligibility.eligible)

  return (
    <div
      className={`order-row ${order.emergency ? "order-row--emergency" : ""} ${outOfReach ? "order-row--disabled" : ""
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
          {selectedVehicle && aiSuggested ? (
            <Bolt
              className="suggestion-star"
              aria-label="Suggested order"
              size={20}
            />
          ) : null}
          <strong className="order-row__kg">{order.kg} kg</strong>
          {selectedVehicle ? (
            !outOfReach ? (
              <Button
                className="order-row__action"
                onClick={() => toggleAdded(order.id)}
                variant={added ? "primary" : "secondary"}
              >
                {added ? "✓ Added" : "+ Add"}
              </Button>
            ) : (
              <span className="out-of-reach" title={reasonText(eligibility?.reasons ?? [])}>
                {eligibility?.reasons[0] ? reasonLabel(eligibility.reasons[0]) : "Out of reach"}
              </span>
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
