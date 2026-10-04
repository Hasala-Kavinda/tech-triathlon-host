import { Clock, Package, Save, X } from "lucide-react"
import { useEffect, useState } from "react"
import { ApiError } from "../api/client"
import { planningApi, type OrderDetail } from "../api/planning"
import { Button, Heading, IconButton, ShopTag } from "./ui"
import type { Order } from "../types/dispatcher";

const STATUS_LABELS: Record<string, { label: string; tone: "scheduled" | "deferred" | "pending" }> = {
  submitted: { label: "Not scheduled", tone: "pending" },
  deferred: { label: "Deferred", tone: "deferred" },
  allocated: { label: "Scheduled", tone: "scheduled" },
  loading: { label: "Being loaded", tone: "scheduled" },
  load_confirmed: { label: "Loaded", tone: "scheduled" },
  in_transit: { label: "On the way", tone: "scheduled" },
  delivered: { label: "Delivered", tone: "scheduled" },
  delivery_failed: { label: "Delivery failed", tone: "deferred" },
  cancelled: { label: "Cancelled", tone: "deferred" },
}

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString("en", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

type OrderDetailsModalProps = {
  order: Order
  notice: { text: string; shareWithCrew: boolean } | undefined
  onSaveNotice: (text: string, shareWithCrew: boolean) => void
  onClose: () => void
}

type LoadState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; detail: OrderDetail }

export function OrderDetailsModal({
  order,
  notice,
  onSaveNotice,
  onClose,
}: OrderDetailsModalProps) {
  const [state, setState] = useState<LoadState>({ phase: "loading" })
  const [text, setText] = useState(notice?.text ?? "")
  const [shareWithCrew, setShareWithCrew] = useState(notice?.shareWithCrew ?? true)
  const saved = notice !== undefined && notice.text === text && notice.shareWithCrew === shareWithCrew

  useEffect(() => {
    let cancelled = false
    if (!order.apiId) {
      setState({ phase: "error", message: "This order is not backed by the planning service, so its details cannot be loaded." })
      return
    }
    setState({ phase: "loading" })
    planningApi.order(order.apiId)
      .then((detail) => { if (!cancelled) setState({ phase: "ready", detail }) })
      .catch((error) => {
        if (cancelled) return
        const notFound = error instanceof ApiError && error.code === "NOT_FOUND"
        setState({ phase: "error", message: notFound ? "This order no longer exists." : error instanceof Error ? error.message : "The order could not be loaded." })
      })
    return () => { cancelled = true }
  }, [order.apiId])

  const detail = state.phase === "ready" ? state.detail : null
  const status = detail ? (STATUS_LABELS[detail.status] ?? { label: detail.status, tone: "pending" as const }) : null
  const totalUnits = detail ? detail.items.reduce((sum, item) => sum + item.quantity, 0) : 0

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
                <span className="data-text">{detail?.orderNumber ?? order.id}</span>
              </Heading>
              {detail ? <ShopTag type={detail.brand} /> : null}
              {detail?.cutoffBucket === "after_cutoff" ? (
                <span className="order-status order-status--emergency">Emergency</span>
              ) : null}
              {status ? <span className={`order-status order-status--${status.tone}`}>{status.label}</span> : null}
            </div>
            {detail ? <p>Submitted by the store · {formatDateTime(detail.createdAt)}</p> : null}
          </div>
          <IconButton icon={X} label="Close order details" onClick={onClose} />
        </div>

        {state.phase === "loading" ? (
          <p role="status" style={{ padding: "24px" }}>Loading order details…</p>
        ) : null}

        {state.phase === "error" ? (
          <p role="alert" style={{ padding: "24px" }}>{state.message}</p>
        ) : null}

        {detail ? (
          <>
            <div className="order-details__strip">
              <div>
                <small>Store</small>
                <strong>{detail.outletId}</strong>
              </div>
              <div>
                <small>Order type</small>
                <strong>{detail.orderType}</strong>
              </div>
              <div>
                <small>Target delivery</small>
                <strong>{formatDate(detail.requestedDate)}</strong>
              </div>
              <div>
                <small>Load</small>
                <strong>
                  {detail.totalWeightKg.toLocaleString(undefined, { maximumFractionDigits: 1 })} kg · {detail.totalVolumeM3.toLocaleString(undefined, { maximumFractionDigits: 2 })} m³
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
                {detail.items.map((item) => (
                  <div className="order-details__product" key={item.sku}>
                    <span className="order-details__product-icon">
                      <Package aria-hidden="true" size={20} />
                    </span>
                    <span className="order-details__product-name">
                      <strong>{item.name}</strong>
                      <small>{item.sku} · Unit: {item.unit}</small>
                    </span>
                    <span className="data-text">
                      {item.quantity} {item.unit}
                    </span>
                  </div>
                ))}
                <div className="order-details__totals">
                  <span>
                    <b className="data-text">{detail.items.length}</b> products
                  </span>
                  <span>
                    <b className="data-text">{totalUnits}</b> total units
                  </span>
                </div>
              </div>

              <div className="order-details__side">
                {detail.deferredTo ? (
                  <div className="order-details__store-note">
                    <small>Deferred</small>
                    <p>
                      New date {formatDate(detail.deferredTo)}
                      {detail.deferralReason ? ` · ${detail.deferralReason.split("_").join(" ")}` : ""}
                    </p>
                  </div>
                ) : null}

                <div className="order-details__store-note">
                  <small>Status history</small>
                  {detail.statusHistory.map((entry) => (
                    <p key={`${entry.status}-${entry.at}`}>
                      <b>{(STATUS_LABELS[entry.status]?.label ?? entry.status)}</b> · {formatDateTime(entry.at)}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </p>
                  ))}
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
          </>
        ) : null}

        <div className="modal__footer order-details__footer">
          <span>
            <Clock aria-hidden="true" size={15} />
            Store details are read only. The notice is kept on this screen only for now.
          </span>
          <Button onClick={onClose}>Close</Button>
          <Button
            disabled={!detail || !text.trim() || saved}
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
