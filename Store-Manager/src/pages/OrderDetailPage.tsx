import { AlertTriangle, ArrowLeft, CalendarDays, Check, CircleAlert, Clock3, KeyRound, PackageCheck, ReceiptText, Truck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../components/common/Button";
import { StatusPill } from "../components/common/StatusPill";
import { formatOrderType, formatOutlet } from "../lib/utils";
import { type StatusKind } from "../types/store";
import { ReviewProductList } from "./ReviewOrderPage";
import { getOrderLifecycle, storeDeliveryApi, type OrderLifecycleData, type OrderUiState } from "../api/store";
import { calmSpring } from "../lib/constants";
import { clockTime, longDate, stamp } from "../lib/time";

type Business = "fresh" | "style" | "tech";

const STATUS_KIND: Record<OrderUiState, StatusKind> = {
  deferred: "deferred", confirmed: "confirmed", scheduled: "scheduled", "on-way": "transit", arrived: "arrived",
  "awaiting-confirmation": "awaiting", "receipt-confirmed": "received", "receipt-issue": "issue",
};
const POLL_STATES: OrderUiState[] = ["scheduled", "on-way", "arrived", "awaiting-confirmation"];
const POLL_MS = 15_000;

/**
 * Order detail. The timeline position, every timestamp, the expected arrival, the PIN action and the receipt entry
 * all come from `GET /store/orders/:id/lifecycle`, which joins the order, its trip and its delivery record. Nothing
 * here is derived from `orders.status` alone (it cannot say "arrived") or from a UI state passed in.
 */
export function OrderDetailPage({
  orderId, business, onBack, onReviewDelivery,
}: {
  orderId?: string
  business: Business
  onBack: () => void
  /** Opens the receipt screen for this delivery. */
  onReviewDelivery: (deliveryId: string) => void
  // Accepted for compatibility with the router; the page no longer depends on them.
  state?: OrderUiState
  onStateChange?: (state: OrderUiState) => void
  onBusinessChange?: (b: Business) => void
  onOpenOrder?: (id: string, view: string, state: string) => void
  onSimulatePin?: () => void
  onNavigateDeferred?: () => void
}) {
  const [data, setData] = useState<OrderLifecycleData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [issuedPin, setIssuedPin] = useState<{ pin: string; expiresAt: string } | null>(null);
  const [pinError, setPinError] = useState("");
  const [pinBusy, setPinBusy] = useState(false);

  const load = useCallback((silent: boolean) => {
    if (!orderId) { setLoading(false); setError("Invalid order"); return Promise.resolve() }
    if (!silent) setLoading(true)
    return getOrderLifecycle(orderId)
      .then((result) => { setData(result); setError(null) })
      .catch((err) => { if (!silent) setError(err instanceof Error ? err.message : "Failed to load order.") })
      .finally(() => { if (!silent) setLoading(false) })
  }, [orderId]);

  useEffect(() => { void load(false) }, [load]);

  const uiState = data?.lifecycle.uiState;
  useEffect(() => {
    if (!uiState || !POLL_STATES.includes(uiState)) return
    const timer = window.setInterval(() => void load(true), POLL_MS)
    return () => window.clearInterval(timer)
  }, [uiState, load]);

  // The plaintext PIN exists only in this component's memory: it is dropped when it expires or the delivery moves on.
  useEffect(() => {
    if (!issuedPin) return
    const left = new Date(issuedPin.expiresAt).getTime() - Date.now()
    const timer = window.setTimeout(() => setIssuedPin(null), Math.max(0, left))
    return () => window.clearTimeout(timer)
  }, [issuedPin]);
  useEffect(() => { if (uiState && uiState !== "arrived" && uiState !== "on-way") setIssuedPin(null) }, [uiState]);

  const canIssuePin = Boolean(data?.delivery && ["pending", "arrived"].includes(data.delivery.status) && data.trip?.status === "in_transit");
  async function issuePin() {
    if (!data?.delivery) return
    setPinBusy(true); setPinError("")
    try { setIssuedPin(await storeDeliveryApi.issuePin(data.delivery._id)) }
    catch (err) { setPinError(err instanceof Error ? err.message : "Unable to issue a PIN.") }
    finally { setPinBusy(false) }
  }

  const order = data?.order;
  const brand = ((order?.brand ?? business).toLowerCase()) as Business;
  const items = order?.items.map((i) => ({ id: i.sku, name: i.name, quantity: i.quantity, unit: i.unit })) ?? [];

  return (
    <div className="order-detail-page">
      <div className="order-detail-utility-row">
        <button className="order-back-link" type="button" onClick={onBack}>
          <ArrowLeft />
          Back to Home
        </button>
      </div>

      <div className="order-detail-header">
        <div>
          <div className="order-detail-title-row">
            <div className="page-title data-title">{order?.orderNumber || orderId}</div>
            {uiState ? (
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={uiState} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
                  <StatusPill kind={STATUS_KIND[uiState]} />
                </motion.div>
              </AnimatePresence>
            ) : null}
          </div>
          {order ? <p>{formatOrderType(brand, order.orderType as never)} · {formatOutlet(brand)}</p> : null}
        </div>
      </div>

      {loading && <p style={{ padding: "0 24px", color: "var(--text-secondary)" }}>Loading order details...</p>}
      {error && <p role="alert" style={{ padding: "0 24px", color: "var(--text-secondary)" }}>{error}</p>}

      {!loading && !error && data && order && uiState && (
        <>
          <Timeline steps={data.lifecycle.steps} />

          <div className="order-detail-layout">
            <div className="order-detail-primary">
              <Hero data={data} uiState={uiState} canIssuePin={canIssuePin} issuedPin={issuedPin} pinBusy={pinBusy} pinError={pinError} onIssuePin={issuePin} onReview={() => data.delivery && onReviewDelivery(data.delivery._id)} />

              {uiState === "confirmed" && (
                <div className="order-detail-info">
                  <span className="next-steps-icon"><Clock3 /></span>
                  <div>
                    <strong>What happens next?</strong>
                    <p>Once the dispatcher schedules this order, the expected arrival time will appear here.</p>
                  </div>
                </div>
              )}

              <section className="ordered-products-panel">
                <div className="order-detail-section-heading">
                  <div>
                    <span>Ordered products</span>
                    <small>The quantities originally requested.</small>
                  </div>
                  <span>{order.items.length} product{order.items.length === 1 ? "" : "s"} · {order.items.reduce((acc, i) => acc + i.quantity, 0)} units</span>
                </div>
                <ReviewProductList items={items} />
              </section>
            </div>

            <aside className="order-record-panel">
              <div className="order-detail-section-heading">
                <div>
                  <span>Record history</span>
                  <small>Activity for this order.</small>
                </div>
              </div>
              <div className="order-activity-list">
                {data.lifecycle.steps.filter((step) => step.state !== "future").map((step) => (
                  <motion.div className="order-activity-row" key={step.key} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} transition={calmSpring}>
                    <span>{step.key === "receipt" ? (uiState === "receipt-issue" ? <AlertTriangle /> : <PackageCheck />) : step.key === "on_the_way" ? <Truck /> : <Check />}</span>
                    <div>
                      <strong>{step.key === "receipt" && uiState === "receipt-issue" ? "Receipt confirmed with issue" : step.label}</strong>
                      <small>{stamp(step.reachedAt)}</small>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="order-record-meta">
                <span><small>Order type</small><strong>{formatOrderType(brand, order.orderType as never)}</strong></span>
                <span><small>Target date</small><strong>{longDate(order.requestedDate)}</strong></span>
                <span><small>Outlet</small><strong>{formatOutlet(brand)}</strong></span>
              </div>
            </aside>
          </div>
        </>
      )}

      <AnimatePresence>
        {uiState === "awaiting-confirmation" && data?.delivery && (
          <motion.div className="order-detail-mobile-action" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }} transition={calmSpring}>
            <Button size="mobile" onClick={() => onReviewDelivery(data.delivery!._id)}>Review delivery</Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function Timeline({ steps }: { steps: OrderLifecycleData["lifecycle"]["steps"] }) {
  return (
    <div className="order-detail-timeline-card">
      <div className="order-detail-lifecycle lifecycle">
        {steps.map((step, index) => (
          <motion.div className={`lifecycle-step lifecycle-step--${step.state}`} key={step.key} layout transition={calmSpring}>
            <motion.span className="step-marker" layout>{step.state === "complete" ? <Check /> : index + 1}</motion.span>
            <span className="step-label">{step.label}</span>
            <small>{step.reachedAt ? stamp(step.reachedAt) : "-"}</small>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

function Hero({ data, uiState, canIssuePin, issuedPin, pinBusy, pinError, onIssuePin, onReview }: {
  data: OrderLifecycleData; uiState: OrderUiState; canIssuePin: boolean
  issuedPin: { pin: string; expiresAt: string } | null; pinBusy: boolean; pinError: string
  onIssuePin: () => void; onReview: () => void
}) {
  const { order, trip, delivery, lifecycle } = data
  const expected = lifecycle.expectedArrivalAt
  const showTripMeta = uiState !== "confirmed" && uiState !== "deferred"
  return (
    <motion.div className={`order-detail-hero order-detail-hero--${uiState}`} key={uiState} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={calmSpring}>
      {uiState === "deferred" && (
        <>
          <span className="order-hero-icon" style={{ background: "var(--sunburst-50)", color: "var(--sunburst-600)" }}><CalendarDays /></span>
          <div className="order-hero-copy">
            <span className="field-label">Current state</span>
            <div className="order-hero-title">Deferred</div>
            <p>{order.deferralReason ? `Reason: ${order.deferralReason}` : "This order has been moved to the next planning cycle."}</p>
          </div>
          <div className="planning-facts">
            <span><small>Target planning run</small><strong>{order.deferredTo ? longDate(order.deferredTo) : longDate(lifecycle.targetPlanningRun)}</strong></span>
            <span><small>Expected arrival</small><strong>Not available yet</strong></span>
          </div>
        </>
      )}

      {uiState === "confirmed" && (
        <>
          <span className="order-hero-icon"><PackageCheck /></span>
          <div className="order-hero-copy">
            <span className="field-label">Current state</span>
            <div className="order-hero-title">Order received successfully</div>
            <p>This order is waiting for delivery planning.</p>
          </div>
          <div className="planning-facts">
            <span><small>Target planning run</small><strong>{longDate(lifecycle.targetPlanningRun)}</strong></span>
            <span><small>Expected arrival</small><strong>Not available yet</strong></span>
          </div>
        </>
      )}

      {(uiState === "scheduled" || uiState === "on-way") && (
        <>
          <span className="order-hero-icon"><Truck /></span>
          <div className="order-hero-copy">
            <span className="field-label">Expected arrival</span>
            <div className="tracking-eta">{expected ? clockTime(expected) : "Not available yet"}</div>
            <p>
              {uiState === "on-way"
                ? `Vehicle departed at ${clockTime(trip?.startedAt)} · ${longDate(lifecycle.targetPlanningRun)}`
                : `${longDate(lifecycle.targetPlanningRun)} · Please have receiving staff ready.`}
            </p>
            {uiState === "on-way" && canIssuePin ? (
              <PinPanel compact issuedPin={issuedPin} busy={pinBusy} error={pinError} onIssue={onIssuePin} />
            ) : null}
          </div>
        </>
      )}

      {uiState === "arrived" && (
        <>
          <span className="order-hero-icon" style={{ background: "var(--indigo-50)", color: "var(--indigo-600)" }}><KeyRound /></span>
          <div className="order-hero-copy" style={{ minWidth: 0, paddingRight: "var(--space-3)" }}>
            <span className="field-label">Delivery verification</span>
            <div className="order-hero-title">Driver has arrived</div>
            <p style={{ marginTop: 4 }}>Arrived at {clockTime(delivery?.arrivedAt)}. Issue a 4-digit code and give it to the driver to verify the delivery.</p>
            <PinPanel issuedPin={issuedPin} busy={pinBusy} error={pinError} onIssue={onIssuePin} disabled={!canIssuePin} />
            <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Note: only share this code with the driver handling this delivery. It is shown once and cannot be shown again.</p>
          </div>
        </>
      )}

      {uiState === "awaiting-confirmation" && (
        <>
          <span className="order-hero-icon"><ReceiptText /></span>
          <div className="order-hero-copy">
            <span className="field-label">Action required</span>
            <div className="order-hero-title">Delivery awaiting confirmation</div>
            <p>{delivery?.completedAt ? `Driver completed delivery at ${clockTime(delivery.completedAt)}. ` : ""}Confirm what arrived at the store.</p>
          </div>
        </>
      )}

      {(uiState === "receipt-confirmed" || uiState === "receipt-issue") && (
        <>
          <span className="order-hero-icon">{uiState === "receipt-confirmed" ? <PackageCheck /> : <AlertTriangle />}</span>
          <div className="order-hero-copy">
            <span className="field-label">Store receipt</span>
            <div className="order-hero-title">{uiState === "receipt-confirmed" ? "Receipt confirmed" : "Receipt confirmed with issue"}</div>
            <p>
              {uiState === "receipt-confirmed"
                ? `The store confirmed all ${order.items.length} product${order.items.length === 1 ? "" : "s"} at ${clockTime(delivery?.receipt?.confirmedAt)}.`
                : `The store recorded an issue at ${clockTime(delivery?.receipt?.confirmedAt)}${delivery?.receipt?.remark ? `: ${delivery.receipt.remark}` : "."}`}
            </p>
          </div>
        </>
      )}

      {showTripMeta && (
        <div className="tracking-meta">
          <span><small>Trip</small><strong className="data-id">{trip?.tripNumber ?? "Pending"}</strong></span>
          <span><small>Vehicle</small><strong className="data-id">{trip?.vehicleId ?? "Pending"}</strong></span>
        </div>
      )}

      {uiState === "awaiting-confirmation" && (
        <Button className="order-hero-action" onClick={onReview}>Review delivery</Button>
      )}
    </motion.div>
  )
}

/** Issues (or rotates) the delivery PIN. The plaintext only ever comes from the issue response and is kept in memory. */
function PinPanel({ issuedPin, busy, error, onIssue, disabled = false, compact = false }: {
  issuedPin: { pin: string; expiresAt: string } | null; busy: boolean; error: string; onIssue: () => void; disabled?: boolean; compact?: boolean
}) {
  return (
    <div style={{ marginTop: compact ? 12 : 8, marginBottom: 12 }}>
      {issuedPin ? (
        <>
          <div style={{ display: "flex", gap: 8, marginBottom: 8 }} aria-label="Delivery PIN">
            {issuedPin.pin.split("").map((digit, i) => (
              <div key={i} style={{ width: 48, height: 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, border: "1px solid var(--border)", borderRadius: 8 }}>{digit}</div>
            ))}
          </div>
          <small style={{ display: "block", marginBottom: 8 }}>Valid until {clockTime(issuedPin.expiresAt)}. A new code replaces this one.</small>
        </>
      ) : null}
      <Button tone={issuedPin ? "secondary" : "primary"} disabled={busy || disabled} onClick={onIssue}>
        {busy ? "Issuing…" : issuedPin ? "Issue a new PIN" : "Issue PIN"}
      </Button>
      {error ? <p role="alert" style={{ color: "var(--critical-500)", fontSize: 13, marginTop: 6 }}>{error}</p> : null}
      {disabled && !issuedPin ? <p style={{ fontSize: 13, color: "var(--text-secondary)" }}><CircleAlert size={14} /> A PIN can be issued while the trip is on the road.</p> : null}
    </div>
  )
}
