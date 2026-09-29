import { Bolt, X } from "lucide-react"
import type { Order, Vehicle } from "../data/sampleData"
import { Button, Heading, IconButton, ShopTag } from "./ui"

type ReviewModalProps = {
  vehicle: Vehicle
  pack: Order[]
  onDrop: (id: string) => void
  onClose: () => void
  onAdd: () => void
}

export function ReviewModal({
  vehicle,
  pack,
  onDrop,
  onClose,
  onAdd,
}: ReviewModalProps) {
  const kg = pack.reduce((sum, order) => sum + order.kg, 0)

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
          <Button onClick={onClose}>Cancel</Button>
          <Button disabled={!pack.length} onClick={onAdd} variant="primary">
            Add {pack.length} {pack.length === 1 ? "order" : "orders"}
          </Button>
        </div>
      </section>
    </div>
  )
}
