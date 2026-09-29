import { Lock, X } from "lucide-react"
import type React from "react"
import type { Order, Vehicle } from "../data/sampleData"
import { Button, Heading, IconButton } from "./ui"

type CheckModalProps = {
  vehicle: Vehicle
  pack: Order[]
  checked: string[]
  setChecked: React.Dispatch<React.SetStateAction<string[]>>
  onDrop: (id: string) => void
  onClose: () => void
  onSchedule: () => void
  /** Orders that must stay on this route (e.g. due today). They show a lock instead of Drop. */
  lockedIds?: string[]
  /** Route label shown in the title. */
  routeName?: string
}

export function CheckModal({
  vehicle,
  pack,
  checked,
  setChecked,
  onDrop,
  onClose,
  onSchedule,
  lockedIds = [],
  routeName = "Galle → Matara",
}: CheckModalProps) {
  const sorted = [...pack].sort((a, b) => (a.stop ?? 0) - (b.stop ?? 0))
  const kg = pack.reduce((sum, order) => sum + order.kg, 0)
  const allChecked = pack.length > 0 && checked.length === pack.length
  const totalItems = pack.reduce((sum, order) => {
    const num = Number.parseInt(order.items) || 0
    return sum + num
  }, 0)

  const toggleAll = () =>
    setChecked(allChecked ? [] : pack.map((order) => order.id))

  const toggle = (id: string) =>
    setChecked((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    )

  return (
    <div className="modal-layer modal-layer--navy">
      <section
        aria-labelledby="check-title"
        aria-modal="true"
        className="modal check-modal"
        role="dialog"
      >
        <div className="modal__heading check-heading">
          <div>
            <Heading id="check-title">Check route · {routeName}</Heading>
            <div className="summary-chips">
              <span>
                {vehicle.id} · {vehicle.type}
              </span>
              <span>
                {pack.length} orders · {pack.length} shops
              </span>
              <span>
                {kg.toLocaleString()} / {vehicle.capacityKg.toLocaleString()} kg ·{" "}
                {Math.round((kg / vehicle.capacityKg) * 100)}%
              </span>
              <span>
                {pack.filter((order) => order.emergency).length} emergency
              </span>
            </div>
          </div>
          <IconButton icon={X} label="Close check sheet" onClick={onClose} />
        </div>

        <div className="formula-bar">
          <span>G{pack.length + 2}</span>
          <b>fx</b>
          <code>=SUM(G2:G{pack.length + 1})</code>
          <em>Sorted by stop order · editable</em>
        </div>

        <div className="table-scroll">
          <table className="check-table">
            <thead>
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    aria-label="Check all orders"
                    checked={allChecked}
                    onChange={toggleAll}
                    type="checkbox"
                  />
                </th>
                <th style={{ width: "40px" }}>#</th>
                <th>Order</th>
                <th>Shop</th>
                <th>Location</th>
                <th>Type</th>
                <th>Items</th>
                <th>kg</th>
                <th>Priority</th>
                <th style={{ width: "90px" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((order, index) => (
                <tr
                  className={order.emergency ? "check-row--emergency" : ""}
                  key={order.id}
                >
                  <td>
                    <input
                      aria-label={`Check ${order.id}`}
                      checked={checked.includes(order.id)}
                      onChange={() => toggle(order.id)}
                      type="checkbox"
                    />
                  </td>
                  <td className="data-text">{index + 1}</td>
                  <td className="data-text">{order.id}</td>
                  <td>{order.shop}</td>
                  <td>{order.town}</td>
                  <td>{order.type}</td>
                  <td>{order.items}</td>
                  <td className="data-text">{order.kg}</td>
                  <td className={order.emergency ? "priority-emergency" : ""}>
                    {order.emergency ? "Emergency" : "Normal"}
                  </td>
                  <td>
                    {lockedIds.includes(order.id) ? (
                      <span
                        className="locked-table-order"
                        title="Due today · can't be removed"
                      >
                        <Lock aria-hidden="true" size={15} /> Due today
                      </span>
                    ) : (
                      <Button onClick={() => onDrop(order.id)} variant="danger">
                        × Drop
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              <tr className="totals-row">
                <td />
                <td />
                <td style={{ fontWeight: 700 }}>Total</td>
                <td style={{ fontWeight: 700 }}>{pack.length} shops</td>
                <td />
                <td />
                <td style={{ fontWeight: 700 }}>{totalItems} items</td>
                <td className="data-text" style={{ fontWeight: 700 }}>
                  {kg.toLocaleString()}
                </td>
                <td style={{ fontWeight: 700 }}>
                  {pack.filter((order) => order.emergency).length} emergency
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>

        <div className="modal__footer check-footer">
          <span>
            {checked.length} of {pack.length} checked.{" "}
            <em>
              {lockedIds.length
                ? "Locked orders are due today and stay on this route."
                : "Drop removes an order from this route."}
            </em>
          </span>
          <Button onClick={onClose} variant="secondary">
            Back to edit
          </Button>
          <Button
            disabled={!allChecked}
            onClick={onSchedule}
            variant="confirm"
          >
            Schedule
          </Button>
        </div>
      </section>
    </div>
  )
}
