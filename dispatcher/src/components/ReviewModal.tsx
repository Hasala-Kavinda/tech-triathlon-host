import { Bolt, X } from "lucide-react"
import { Button, Heading, IconButton, ShopTag } from "./ui"
import type { Order, Vehicle } from "../types/dispatcher";

type ReviewModalProps = {
  vehicle: Vehicle
  pack: Order[]
  onDrop: (id: string) => void
  onClose: () => void
  onAdd: () => void
  /** Offered when the engine can propose a different pack; absent otherwise. */
  onSuggestAnother?: () => void
  suggestAnotherDisabled?: boolean
  /** Weight already on the vehicle (e.g. locked orders) so the header shows the real load. */
  baseKg?: number
}

export function ReviewModal({
  vehicle,
  pack,
  onDrop,
  onClose,
  onAdd,
  onSuggestAnother,
  suggestAnotherDisabled = false,
  baseKg = 0,
}: ReviewModalProps) {
  const kg = pack.reduce((sum, order) => sum + order.kg, 0) + baseKg

  return (
    <div
      className="modal-layer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        aria-labelledby="review-title"
        aria-modal="true"
        className="modal review-modal ai-review-modal"
        role="dialog"
      >
        <div className="modal__heading">
          <div>
            <Heading id="review-title">
              <Bolt aria-hidden="true" size={26} color="var(--cobalt-500)" />
              <span>Review AI suggested pack</span>
            </Heading>
            <p>
              {vehicle.id} · {pack.length} orders · {kg.toLocaleString()} /{" "}
              {vehicle.capacityKg.toLocaleString()} kg
            </p>
          </div>
          <IconButton icon={X} label="Close review" onClick={onClose} />
        </div>

        <div className="review-list">
          {pack.map((order) => (
            <div
              className={`review-row ${order.emergency ? "review-row--emergency" : ""}`}
              key={order.id}
            >
              <div>
                <span className="review-row__title">
                  <span className="data-text">{order.id}</span>
                  <ShopTag type={order.type} />
                  {order.emergency ? <b>Emergency</b> : null}
                </span>
                <span>
                  {order.shop} · {order.town} · {order.items}
                </span>
              </div>
              <strong className="data-text">{order.kg} kg</strong>
              <Button onClick={() => onDrop(order.id)} variant="danger">
                × Drop
              </Button>
            </div>
          ))}
        </div>

        <div className="modal__footer">
          <span>Drop any order you don&apos;t want.</span>
          {onSuggestAnother ? (
            <Button disabled={suggestAnotherDisabled} icon={Bolt} onClick={onSuggestAnother} variant="secondary">
              Suggest another
            </Button>
          ) : null}
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={!pack.length} onClick={onAdd} variant="primary">
            Add {pack.length} {pack.length === 1 ? "order" : "orders"}
          </Button>
        </div>
      </section>
    </div>
  )
}
