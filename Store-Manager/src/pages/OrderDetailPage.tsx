import { ArrowLeft, CircleAlert, AlertTriangle, Clock3, Check, CalendarDays, PackageCheck, Truck, KeyRound, ReceiptText } from "lucide-react";
import {  AnimatePresence, motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {  Button  } from '../components/common/Button';
import { StatusPill } from "../components/common/StatusPill";
import { selectedProducts, getDefaultOrderType, getDraft, formatOrderType, formatOutlet } from "../lib/utils";
import { OrderDetailState, type StatusKind } from "../types/store";
import { ReviewProductList } from "./ReviewOrderPage";
import { getOrder, type StoreOrder } from "../api/store";
import { orderDetailStep, orderActivity, calmSpring } from "../lib/constants";

export function OrderDetailPage({
      orderId,
      business,
      state,
      onBack,
      onStateChange,
      onReviewDelivery,
      onBusinessChange,
      onSimulatePin,
      onNavigateDeferred,
    }: {
          orderId?: string
          business: "fresh" | "style" | "tech"
          state: OrderDetailState
          onBack: () => void
          onStateChange: (state: OrderDetailState) => void
          onReviewDelivery: () => void
            onOpenOrder: (id: string, view: string, state: string) => void
            onBusinessChange?: (b: "fresh" | "style" | "tech") => void
          onSimulatePin?: () => void
          onNavigateDeferred: () => void
        }) {
    const [warehouseIssue, setWarehouseIssue] = useState(false);
    const [wasDeferred, setWasDeferred] = useState(state === "deferred");
    useEffect(() => {
    if (state === "deferred") setWasDeferred(true)
    }, [state])
    const statusKind: Record<OrderDetailState, StatusKind> = {
            deferred: "deferred",
            confirmed: "confirmed",
            scheduled: "scheduled",
            "on-way": "transit",
            arrived: "arrived",
            
            "awaiting-confirmation": "awaiting",
            "receipt-confirmed": "received",
            "receipt-issue": "issue",
          };
    
    const [order, setOrder] = useState<StoreOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      if (!orderId) {
        setLoading(false);
        setError("Invalid order");
        return;
      }
      getOrder(orderId)
        .then((data) => {
          if (!cancelled) {
            setOrder(data);
            setError(null);
          }
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load order.");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => { cancelled = true; };
    }, [orderId]);

    const items = order?.items.map(i => ({
      id: i.sku,
      name: i.name,
      quantity: i.quantity,
      unit: i.unit,
    })) ?? [];

    const showAction = state === "awaiting-confirmation";
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
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={order?.status || state}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.18 }}
                  >
                    <StatusPill kind={statusKind[state]} />
                  </motion.div>
                </AnimatePresence>
              </div>
              <p>{order ? formatOrderType(order.brand as any, order.orderType as any) : formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh"))} · {order ? formatOutlet(order.brand as any) : formatOutlet(business)}</p>
            </div>
          </div>

          {loading && <p style={{ padding: "0 24px", color: "var(--text-secondary)" }}>Loading order details...</p>}
          {error && <p style={{ padding: "0 24px", color: "var(--text-secondary)" }}>{error}</p>}
          
          {!loading && !error && order && (
            <>
              <OrderDetailLifecycle state={state} wasDeferred={wasDeferred} order={order} />

              <div className="order-detail-layout">
                <div className="order-detail-primary">
              
              
              


              <OrderDetailHero state={state} onReviewDelivery={onReviewDelivery} onConfirmArrived={() => onStateChange("awaiting-confirmation")} orderId={orderId} order={order || undefined} />

    {state === "deferred" && (
                <motion.div className="delivery-update-card" style={{ marginTop: -16, marginBottom: 24 }} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={calmSpring}>
                  <div className="order-detail-section-heading">
                    <div>
                      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <CircleAlert size={16} /> Delivery deferred
                      </span>
                      <small>No action required.</small>
                    </div>
                  </div>
                  <div className="delivery-update-grid">
                    <span>
                      <small>Original plan</small>
                      <strong>Thursday, 1 October</strong>
                    </span>
                    <span className="delivery-update-new">
                      <small>New expected delivery</small>
                      <strong>Friday, 2 October</strong>
                    </span>
                    <span>
                      <small>Reason</small>
                      <strong>{business === "fresh" ? "Refrigerated delivery capacity unavailable" : "Vehicle capacity constraints"}</strong>
                    </span>
                  </div>
                </motion.div>
              )}


              <AnimatePresence>
                {state === "on-way" && warehouseIssue && (
                  <motion.div
                    className="warehouse-issue-card"
                    initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                    animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
                    exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                    transition={calmSpring}
                    style={{ overflow: "hidden" }}
                  >
                    <div style={{ display: "flex", gap: "12px", padding: "16px", background: "var(--sunburst-50)", border: "1px solid var(--sunburst-200)", borderRadius: "8px" }}>
                      <AlertTriangle style={{ color: "var(--sunburst-600)", width: 20, height: 20, flexShrink: 0 }} />
                      <div>
                        <strong style={{ display: "block", color: "var(--sunburst-900)", fontSize: 14, marginBottom: 4 }}>Order out for delivery with an issue</strong>
                        <p style={{ margin: "0 0 8px 0", color: "var(--sunburst-900)", fontSize: 13, lineHeight: 1.4 }}>2 cartons of Milk powder were unavailable during loading.</p>
                        <span style={{ color: "var(--sunburst-700)", fontSize: 12 }}>Reported during loading &middot; 05:32</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>


              {state === "confirmed" && (
                <div className="order-detail-info">
                  <span className="next-steps-icon">
                    <Clock3 />
                  </span>
                  <div>
                    <strong>What happens next?</strong>
                    <p>
                      Once the dispatcher schedules this order, the expected arrival
                      time will appear here.
                    </p>
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
              <OrderActivity state={state} />

              <div className="order-record-meta">
                <span>
                  <small>Order type</small>
                  <strong>{formatOrderType(order.brand as any, order.orderType as any)}</strong>
                </span>
                <span>
                  <small>Target date</small>
                  <strong>{new Date(order.requestedDate).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}</strong>
                </span>
                <span>
                  <small>Outlet</small>
                  <strong>{formatOutlet(order.brand as any)}</strong>
                </span>
              </div>
            </aside>
          </div>
          </>
          )}

          <AnimatePresence>
            {showAction && (
              <motion.div
                className="order-detail-mobile-action"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={calmSpring}
              >
                <Button size="mobile" onClick={onReviewDelivery}>
                  Review delivery
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )
}

export function OrderDetailLifecycle({ state, wasDeferred, order }: { state: OrderDetailState, wasDeferred: boolean, order?: StoreOrder }) {
    const stages = wasDeferred ? [
            "Order confirmed",
            "Deferred",
            "Scheduled",
            "On the way",
            "Arrived",
            "Receipt confirmation",
          ] : [
            "Order confirmed",
            "Scheduled",
            "On the way",
            "Arrived",
            "Receipt confirmation",
          ];
    let currentStep = 0;
    if (state === "confirmed") currentStep = 0;
    else if (state === "deferred") currentStep = 1;
    else if (state === "scheduled") currentStep = wasDeferred ? 2 : 1;
    else if (state === "on-way") currentStep = wasDeferred ? 3 : 2;
    else if (state === "arrived") currentStep = wasDeferred ? 4 : 3;
    else currentStep = wasDeferred ? 5 : 4;
    const receiptComplete = state === "receipt-confirmed" || state === "receipt-issue";
    const timestamps = stages.map((s, i) => {
            if (i > currentStep && !receiptComplete) return "-";
            if (s === "Order confirmed") return order ? new Date(order.createdAt).toLocaleDateString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" }) : "Wed · 13:46";
            if (s === "Deferred") return "Wed · 16:42";
            if (s === "Scheduled") return "Wed · 16:35";
            if (s === "On the way") return "Thu · 05:48";
            if (s === "Arrived") return "Thu · 06:43";
            if (s === "Receipt confirmation") {
              if (state === "receipt-confirmed") return "Thu · 06:57";
              if (state === "receipt-issue") return "Thu · 06:59";
              if (state === "awaiting-confirmation") return "Current";
              return "-";
            }
            return "-";
          });
    return (
    <div className="order-detail-timeline-card">
      <div className="order-detail-lifecycle lifecycle">
        {stages.map((stage, index) => {
          const mode = receiptComplete
            ? "complete"
            : index < currentStep
              ? "complete"
              : index === currentStep
                ? "current"
                : "future"
          return (
            <motion.div
              className={`lifecycle-step lifecycle-step--${mode}`}
              key={stage}
              layout
              transition={calmSpring}
            >
              <motion.span className="step-marker" layout>
                {mode === "complete" ? <Check /> : index + 1}
              </motion.span>
              <span className="step-label">{stage}</span>
              <small>{timestamps[index]}</small>
            </motion.div>
          )
        })}
      </div>
    </div>
    )
}

export function OrderDetailHero({ onConfirmArrived, 
      state,
      onReviewDelivery,
      orderId,
      order,
    }: {
          state: OrderDetailState
          onReviewDelivery: () => void
          onConfirmArrived: () => void
          orderId?: string
          order?: StoreOrder
        }) {
    const showDeliveryMeta = state !== "confirmed" && state !== "arrived";
    return (
    <motion.div
      className={`order-detail-hero order-detail-hero--${state}`}
      key={state}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calmSpring}
    >
      {state === "deferred" && (
        <>
          <span className="order-hero-icon" style={{ background: "var(--sunburst-50)", color: "var(--sunburst-600)" }}>
            <CalendarDays />
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Current state</span>
            <div className="order-hero-title">Deferred</div>
            <p>This order has been moved to the next planning cycle.</p>
          </div>
          <div className="planning-facts">
            <span>
              <small>Target planning run</small>
              <strong>Friday, 2 October</strong>
            </span>
            <span>
              <small>Expected arrival</small>
              <strong>Not available yet</strong>
            </span>
          </div>
        </>
      )}

      {state === "confirmed" && (
        <>
          <span className="order-hero-icon">
            <PackageCheck />
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Current state</span>
            <div className="order-hero-title">Order received successfully</div>
            <p>This order is waiting for delivery planning.</p>
          </div>
          <div className="planning-facts">
            <span>
              <small>Target planning run</small>
              <strong>Thursday, 1 October</strong>
            </span>
            <span>
              <small>Expected arrival</small>
              <strong>Not available yet</strong>
            </span>
          </div>
        </>
      )}

      {(state === "scheduled" || state === "on-way") && (
        <>
          <span className="order-hero-icon">
            <Truck />
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Expected arrival</span>
            <div className="tracking-eta">06:40–07:00</div>
            <p>
              {state === "on-way"
                ? "Vehicle departed at 05:48 · On schedule"
                : "Thursday, 1 October · Please have receiving staff ready."}
            </p>
          </div>
        </>
      )}
      {state === "arrived" && (
        <>
          <span className="order-hero-icon" style={{ background: "var(--indigo-50)", color: "var(--indigo-600)" }}>
            <KeyRound />
          </span>
          <div className="order-hero-copy" style={{ minWidth: 0, paddingRight: "var(--space-3)" }}>
            <span className="field-label">Delivery verification</span>
            <div className="order-hero-title">Verify delivery arrival</div>
            <p style={{ marginTop: 4, marginBottom: 16 }}>Give this 4-digit code to the driver to verify the delivery.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {["4", "8", "2", "7"].map((num, i) => (
                <div key={i} style={{ width: 48, height: 56, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, fontWeight: 700, border: "1px solid var(--border)", borderRadius: 6, color: "var(--navy-900)", background: "var(--navy-50)" }}>{num}</div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 12, alignItems: "center", fontSize: 13, color: "var(--text-primary)", fontWeight: 500, marginBottom: 8, flexWrap: "wrap" }}>
              <span>{order?.orderNumber || orderId}</span>
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <span>Pending</span>
              <span style={{ color: "var(--text-tertiary)" }}>•</span>
              <span>Arrived 06:43</span>
            </div>
            <p style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Note: Only share this code with the driver handling this delivery.</p>
          </div>
          <div className="arrived-action-panel">
            <div>
              <div style={{ fontWeight: 600, color: "var(--navy-900)", marginBottom: 4 }}>Delivery at your store?</div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.4, marginBottom: 12 }}>Confirm after the vehicle has arrived and the driver has verified the code.</p>
            </div>
            <Button onClick={onConfirmArrived} className="full-width-btn">
              Confirm delivery arrived
            </Button>
          </div>
        </>
      )}
      {state === "awaiting-confirmation" && (
        <>
          <span className="order-hero-icon">
            <ReceiptText />
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Action required</span>
            <div className="order-hero-title">
              Delivery awaiting confirmation
            </div>
            <p>
              Driver completed delivery at 06:52. Confirm what arrived at the
              store.
            </p>
          </div>
        </>
      )}

      {(state === "receipt-confirmed" || state === "receipt-issue") && (
        <>
          <span className="order-hero-icon">
            {state === "receipt-confirmed" ? (
              <PackageCheck />
            ) : (
              <AlertTriangle />
            )}
          </span>
          <div className="order-hero-copy">
            <span className="field-label">Store receipt</span>
            <div className="order-hero-title">
              {state === "receipt-confirmed"
                ? "Receipt confirmed"
                : "Receipt confirmed with issue"}
            </div>
            <p>
              {state === "receipt-confirmed"
                ? "The store confirmed all 4 products at 06:57."
                : "The store recorded missing and damaged goods at 06:59."}
            </p>
          </div>
        </>
      )}

      {showDeliveryMeta && (
        <div className="tracking-meta">
          <span>
            <small>Trip</small>
            <strong className="data-id">Pending</strong>
          </span>
          <span>
            <small>Vehicle</small>
            <strong className="data-id">Pending</strong>
          </span>
        </div>
      )}





      {state === "awaiting-confirmation" && (
        <Button className="order-hero-action" onClick={onReviewDelivery}>
          Review delivery
        </Button>
      )}
    </motion.div>
    )
}

export function OrderActivity({ state }: { state: OrderDetailState }) {
    const currentStep = orderDetailStep[state];
    const receiptComplete = state === "receipt-confirmed" || state === "receipt-issue";
    return (
    <div className="order-activity-list">
      {orderActivity
        .filter((activity) => activity.step <= currentStep)
        .map((activity) => (
          <motion.div
            className="order-activity-row"
            key={activity.label}
            initial={{ opacity: 0, x: 6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={calmSpring}
          >
            <span>{activity.icon}</span>
            <div>
              <strong>{activity.label}</strong>
              <small>{activity.time}</small>
            </div>
          </motion.div>
        ))}
      {receiptComplete && (
        <motion.div
          className="order-activity-row"
          initial={{ opacity: 0, x: 6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={calmSpring}
        >
          <span>
            {state === "receipt-confirmed" ? (
              <PackageCheck />
            ) : (
              <AlertTriangle />
            )}
          </span>
          <div>
            <strong>
              {state === "receipt-confirmed"
                ? "Receipt confirmed"
                : "Receipt confirmed with issue"}
            </strong>
            <small>
              {state === "receipt-confirmed" ? "Thu · 06:57" : "Thu · 06:59"}
            </small>
          </div>
        </motion.div>
      )}
    </div>
    )
}
