import { Clock, Package, Phone, Save, UserRound, X } from "lucide-react"
import { useState } from "react"
import type { Order } from "../data/sampleData"
import { Button, Heading, IconButton, ShopTag, UnstyledButton } from "./ui"

/* Details sent by the store manager when the order was submitted
   (see the store "Review order" screen). Built from the order so every
   order has consistent sample data without changing sampleData. */

type Product = { name: string; unit: string; units: string; qty: number }

const CATALOG: Record<string, { category: string; products: Omit<Product, "qty">[] }> = {
  Fresh: {
    category: "Dry groceries",
    products: [
      { name: "Rice", unit: "bag", units: "bags" },
      { name: "Milk powder", unit: "carton", units: "cartons" },
      { name: "Flour", unit: "bag", units: "bags" },
      { name: "Cooking oil", unit: "bottle", units: "bottles" },
      { name: "Sugar", unit: "bag", units: "bags" },
    ],
  },
  Tech: {
    category: "Electronics & accessories",
    products: [
      { name: "Phone chargers", unit: "box", units: "boxes" },
      { name: "Earbuds", unit: "box", units: "boxes" },
      { name: "Power banks", unit: "box", units: "boxes" },
      { name: "USB cables", unit: "box", units: "boxes" },
    ],
  },
  Style: {
    category: "Clothing & footwear",
    products: [
      { name: "T-shirts", unit: "pack", units: "packs" },
      { name: "Sandals", unit: "box", units: "boxes" },
      { name: "Handbags", unit: "box", units: "boxes" },
      { name: "Denim", unit: "pack", units: "packs" },
    ],
  },
}

const STOCK_MANAGERS: Record<string, { name: string; phone: string }> = {
  "Sunrise Mart": { name: "Ruwan Perera", phone: "+94 71 234 5678" },
  "Lanka Super Stores": { name: "Kavindi Fernando", phone: "+94 71 456 7890" },
  "Coastal Traders": { name: "Sanjeewa Silva", phone: "+94 77 345 6789" },
  "Matara City Mart": { name: "Dilani Jayasinghe", phone: "+94 76 222 8841" },
  "Hill View Stores": { name: "Chaminda Rajapaksha", phone: "+94 70 555 1290" },
  "Galle Fashion House": { name: "Nadeesha Wickramasinghe", phone: "+94 72 610 4471" },
  "Mirissa Mart": { name: "Tharindu Gunawardena", phone: "+94 75 318 9922" },
  "Fort Book Corner": { name: "Ishara de Silva", phone: "+94 77 901 3345" },
  "Imaduwa Traders": { name: "Pradeep Kumara", phone: "+94 71 880 2213" },
  "Akuressa Food City": { name: "Malini Herath", phone: "+94 76 443 7780" },
}

const FALLBACK_NAMES = ["Asanka Bandara", "Sachini Peiris", "Nuwan Dissanayake", "Hiruni Senanayake"]

const STORE_NOTES: Record<string, string> = {
  "ORD-1045":
    "Shelves have been empty since this morning. Please deliver before 12:00 and ask for Dilani at the back gate.",
  "ORD-1047":
    "Front entrance is closed for repairs. Use the side lane; the unloading bay opens at 09:00.",
  "ORD-1052":
    "Two cartons from the last delivery arrived damaged. Please pack the earbuds boxes carefully.",
  "ORD-1072": "The shop closes from 1 to 2 PM for lunch. Deliver before 1 PM if possible.",
}

function orderNumber(id: string) {
  return Number(id.replace(/\D/g, "")) || 1000
}

export function storeOrderDetails(order: Order) {
  const n = orderNumber(order.id)
  const catalog = CATALOG[order.type] ?? CATALOG.Fresh
  const count = Math.min(3 + (n % 2), catalog.products.length)
  const products: Product[] = catalog.products.slice(0, count).map((p, i) => ({
    ...p,
    qty: 5 + ((n * (i + 3)) % 6) * 5,
  }))
  const manager =
    STOCK_MANAGERS[order.shop] ?? {
      name: FALLBACK_NAMES[n % FALLBACK_NAMES.length],
      phone: `+94 7${n % 8} ${String(n).padStart(3, "0")} ${String((n * 7) % 10000).padStart(4, "0")}`,
    }
  const day = order.dueDay ?? 27
  const submittedDay = day - 1
  return {
    category: catalog.category,
    products,
    totalUnits: products.reduce((sum, p) => sum + p.qty, 0),
    manager,
    storeNote: STORE_NOTES[order.id] ?? "",
    submitted: `${new Date(2026, 8, submittedDay).toLocaleString("en", { weekday: "short" })} ${submittedDay} Sep · ${String(9 + (n % 7)).padStart(2, "0")}:${String((n * 13) % 60).padStart(2, "0")}`,
    target:
      day === 27
        ? "Today · Sun 27 Sep"
        : `${new Date(2026, 8, day).toLocaleString("en", { weekday: "long" })}, ${day} September`,
  }
}

type OrderDetailsModalProps = {
  order: Order
  notice: { text: string; shareWithCrew: boolean } | undefined
  onSaveNotice: (text: string, shareWithCrew: boolean) => void
  onClose: () => void
}

export function OrderDetailsModal({
  order,
  notice,
  onSaveNotice,
  onClose,
}: OrderDetailsModalProps) {
  const details = storeOrderDetails(order)
  const [text, setText] = useState(notice?.text ?? "")
  const [shareWithCrew, setShareWithCrew] = useState(notice?.shareWithCrew ?? true)
  const status = order.deferred
    ? { label: "Deferred", className: "order-status order-status--deferred" }
    : order.stop
      ? { label: "Scheduled", className: "order-status order-status--scheduled" }
      : { label: "Not scheduled", className: "order-status order-status--pending" }
  const saved = notice !== undefined && notice.text === text && notice.shareWithCrew === shareWithCrew

  return (
    <div
      className="modal-layer order-details-layer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        aria-labelledby="order-details-title"
        aria-modal="true"
        className="modal order-details-modal"
        role="dialog"
      >
        <div className="modal__heading">
          <div>
            <span className="order-details__eyebrow">Store order</span>
            <div className="order-details__title">
              <Heading id="order-details-title">
                <span className="data-text">{order.id}</span>
              </Heading>
              <ShopTag type={order.type} />
              {order.emergency ? (
                <span className="order-status order-status--emergency">Emergency</span>
              ) : null}
              <span className={status.className}>{status.label}</span>
            </div>
            <p>Submitted by the store · {details.submitted}</p>
          </div>
          <IconButton icon={X} label="Close order details" onClick={onClose} />
        </div>

        <div className="order-details__strip">
          <div>
            <small>Store</small>
            <strong>
              {order.shop} · {order.town}
            </strong>
          </div>
          <div>
            <small>Category</small>
            <strong>{details.category}</strong>
          </div>
          <div>
            <small>Target delivery</small>
            <strong>{details.target}</strong>
          </div>
          <div>
            <small>Load</small>
            <strong>
              {order.kg} kg · {order.items}
            </strong>
          </div>
        </div>

        <div className="order-details__grid">
          <div className="order-details__products">
            <div className="order-details__section-head">
              <strong>Products</strong>
              <span>As confirmed by the store manager</span>
            </div>
            <div className="order-details__table-head">
              <span>Product</span>
              <span>Quantity</span>
            </div>
            {details.products.map((p) => (
              <div className="order-details__product" key={p.name}>
                <span className="order-details__product-icon">
                  <Package aria-hidden="true" size={20} />
                </span>
                <span className="order-details__product-name">
                  <strong>{p.name}</strong>
                  <small>Unit: {p.unit}</small>
                </span>
                <span className="data-text">
                  {p.qty} {p.qty === 1 ? p.unit : p.units}
                </span>
              </div>
            ))}
            <div className="order-details__totals">
              <span>
                <b className="data-text">{details.products.length}</b> products
              </span>
              <span>
                <b className="data-text">{details.totalUnits}</b> total units
              </span>
            </div>
          </div>

          <div className="order-details__side">
            <div className="order-details__manager">
              <span className="order-details__avatar">
                <UserRound aria-hidden="true" size={26} />
              </span>
              <span>
                <strong>{details.manager.name}</strong>
                <small>Stock manager · {order.shop}</small>
                <UnstyledButton
                  className="person-card__phone"
                  onClick={() => {
                    window.location.href = `tel:${details.manager.phone.replace(/ /g, "")}`
                  }}
                >
                  <Phone aria-hidden="true" size={13} />
                  {details.manager.phone}
                </UnstyledButton>
              </span>
            </div>

            <div
              className={`order-details__store-note ${details.storeNote ? "" : "order-details__store-note--empty"
                }`}
            >
              <small>Note from the store</small>
              <p>{details.storeNote || "No special note from the store."}</p>
            </div>

            <label className="order-details__notice">
              <span>Dispatcher notice · special cases</span>
              <textarea
                onChange={(e) => setText(e.target.value)}
                placeholder="e.g. Deliver before noon, call the stock manager on arrival, fragile items…"
                value={text}
              />
            </label>
            <label className="order-details__share">
              <input
                checked={shareWithCrew}
                onChange={(e) => setShareWithCrew(e.target.checked)}
                type="checkbox"
              />
              Show this notice to the driver and loaders
            </label>
          </div>
        </div>

        <div className="modal__footer order-details__footer">
          <span>
            <Clock aria-hidden="true" size={15} />
            Store details are read only. The notice stays with this order.
          </span>
          <Button onClick={onClose}>Close</Button>
          <Button
            disabled={!text.trim() || saved}
            icon={Save}
            onClick={() => onSaveNotice(text.trim(), shareWithCrew)}
            variant="primary"
          >
            {saved ? "Notice saved" : "Save notice"}
          </Button>
        </div>
      </section>
    </div>
  )
}