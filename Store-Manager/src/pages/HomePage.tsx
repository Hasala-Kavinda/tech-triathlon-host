import { ChevronDown, ArrowRight, CalendarDays, AlertTriangle } from "lucide-react";
import {  motion, AnimatePresence  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {  Button  } from '../components/common/Button';
import { AttentionCard } from "../components/common/PrototypeMisc";
import {  StatusPill  } from '../components/common/StatusPill';
import { FloatingNewOrder } from "../components/layout/TopBar";
import { getDashboard, type DashboardPayload } from "../api/store";
import { type UpcomingDelivery, type StatusKind } from "../types/store";
import { statusDetails, calmSpring } from "../lib/constants";

const deliveryStatusKind: Record<string, StatusKind> = { pending: "scheduled", arrived: "arrived", delivered: "received", failed: "issue" };
const orderStatusKind: Record<string, StatusKind> = { submitted: "awaiting", deferred: "deferred", allocated: "scheduled", loading: "scheduled", load_confirmed: "scheduled", in_transit: "transit", delivered: "received", delivery_failed: "issue", cancelled: "issue" };

type UpcomingDeliveryData = DashboardPayload["upcomingDeliveries"][number];

const deliveryOrderLabel = (delivery: UpcomingDeliveryData) =>
  delivery.orders.map((order) => order.orderNumber).join(", ") || delivery._id;

// Planned arrival from the published trip; falls back to when the delivery was created.
const deliveryWhen = (delivery: UpcomingDeliveryData) =>
  new Date(delivery.arrivedAt ?? delivery.trip?.plannedArrivalAt ?? delivery.trip?.departureAt ?? delivery.createdAt);

const deliveryEta = (delivery: UpcomingDeliveryData) => {
  const planned = delivery.trip?.plannedArrivalAt;
  if (!planned) return "Scheduled";
  const time = new Date(planned).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `ETA ${time}${delivery.trip ? ` · ${delivery.trip.vehicleId}` : ""}`;
};

export function HomePage({
      showAttention = true,
      afterCutoff = false,
      showUpcoming = true,
      onNewOrder,
      onOpenDeferred,
      business,
      onOpenOrder,
      onBusinessChange,
      onNavigate,
    }: {
          showAttention?: boolean
          afterCutoff?: boolean
          showUpcoming?: boolean
          onNewOrder: () => void
          onOpenDeferred: () => void
          business: "fresh" | "style" | "tech"
          onOpenOrder: (id: string, view: string, state: string) => void
          onBusinessChange?: (b: "fresh" | "style" | "tech") => void
          onNavigate: (label: string) => void
        }) {
    const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
      let cancelled = false;
      getDashboard()
        .then((payload) => { if (!cancelled) { setDashboard(payload); setError(null); } })
        .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load dashboard."); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, []);
    const nextDelivery = dashboard?.upcomingDeliveries[0] ?? null;
    return (
        <div className="home-page">
          <div className="home-page-header">
            <div>
              <span className="home-greeting">Good morning, Dilini</span>
              <div className="page-title">Home</div>
              <p>Here's what's happening at your store today.</p>
            </div>
            
          </div>

          {business && onBusinessChange && (
            <div className="prototype-state-control" style={{ marginBottom: 24 }}>
              <span className="prototype-only-label">Prototype only</span>
              <label style={{ gridColumn: "1 / -1" }}>
                <span>Outlet type</span>
                <span className="prototype-select-wrap">
                  <select
                    value={business}
                    onChange={(event) => onBusinessChange(event.target.value as "fresh" | "style" | "tech")}
                  >
                    <option value="fresh">Waypoint Fresh</option>
                    <option value="style">Waypoint Style</option>
                    <option value="tech">Waypoint Tech</option>
                  </select>
                  <ChevronDown />
                </span>
              </label>
            </div>
          )}
          

          

          

          <motion.section className="home-section" layout transition={calmSpring}>
            <HomeSectionHeader title="Next delivery" />
            <NextDeliveryHero delivery={nextDelivery} onOpen={() => nextDelivery && onOpenOrder(nextDelivery._id, "order-detail", "scheduled")} />
          </motion.section>

    <AnimatePresence initial={false}>
            {showAttention && (
              <motion.section
                className="home-section attention-section"
                layout
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0, y: -8 }}
                transition={calmSpring}
              >
                <HomeSectionHeader title="Needs attention" />
                <AttentionCard onOpen={() => onOpenOrder("ORD-1045", "verify-delivery", "verify")} />
              </motion.section>
            )}
          </AnimatePresence>

          <motion.div className="home-bottom-grid" layout transition={calmSpring}>
            <section className="home-panel upcoming-panel">
              <HomeSectionHeader title="Upcoming deliveries" action="View all" onAction={() => onNavigate("Orders")} />
              <AnimatePresence mode="wait" initial={false}>
                {showUpcoming ? (
                  <motion.div
                    className="upcoming-list"
                    key="upcoming-list"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={calmSpring}
                  >
                    {loading && <p style={{ color: "var(--text-secondary)" }}>Loading…</p>}
                    {error && <p style={{ color: "var(--text-secondary)" }}>{error}</p>}
                    {!loading && !error && (dashboard?.upcomingDeliveries ?? []).map((delivery) => (
                      <UpcomingDeliveryRow
                        key={delivery._id}
                        delivery={{
                          id: deliveryOrderLabel(delivery),
                          type: `${delivery.items.length} product${delivery.items.length === 1 ? "" : "s"}${delivery.orders[0] ? ` · ${delivery.orders[0].orderType}` : ""}`,
                          date: deliveryWhen(delivery).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
                          status: delivery.status === "arrived" ? "confirmed" : "scheduled",
                          eta: delivery.status === "arrived" ? "Arrived" : deliveryEta(delivery),
                        }}
                        onOpen={() => onOpenOrder(delivery._id, "order-detail", "scheduled")}
                      />
                    ))}
                    {!loading && !error && (dashboard?.upcomingDeliveries ?? []).length === 0 && <UpcomingEmptyState />}
                  </motion.div>
                ) : (
                  <UpcomingEmptyState key="upcoming-empty" />
                )}
              </AnimatePresence>
            </section>

            <section className="home-panel activity-panel">
              <HomeSectionHeader title="Recent activity" action="View all" onAction={() => onNavigate("Deliveries")} />
              <RecentActivityList orders={dashboard?.recentOrders ?? []} loading={loading} />
            </section>
          </motion.div>
          <FloatingNewOrder onClick={onNewOrder} />
        </div>
      )
}

export function HomeSectionHeader({
        title,
        action,
        onAction,
      }: {
        title: string
        action?: string
        onAction?: () => void
        }) {
    return (
    <div className="home-section-header">
      <div className="home-section-title">{title}</div>
      {action && (
        <Button tone="secondary" className="text-button" onClick={onAction}>
          {action}
          <ArrowRight />
        </Button>
      )}
    </div>
    )
}

export function NextDeliveryHero({ onOpen, delivery }: { onOpen?: () => void, delivery?: DashboardPayload["upcomingDeliveries"][number] | null }) {
    if (!delivery) {
      return (
        <motion.div className="next-delivery-card" layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={calmSpring}>
          <div className="next-delivery-main">
            <div className="delivery-name">No upcoming deliveries</div>
            <span className="order-reference">New deliveries will appear here once a trip is published.</span>
          </div>
        </motion.div>
      );
    }
    const kind = deliveryStatusKind[delivery.status] ?? "scheduled";
    return (
    <motion.div
      className="next-delivery-card"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calmSpring}
    >
      <div className="next-delivery-main">
        <div className="next-delivery-heading">
          <span className="delivery-date">
            <CalendarDays />
            {deliveryWhen(delivery).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
          </span>
          <StatusPill kind={kind} />
        </div>
        <div className="delivery-name">{delivery.status === "arrived" ? "Delivery arrived" : "Delivery scheduled"}</div>
        <span className="order-reference">
          Order <strong className="data-id">{deliveryOrderLabel(delivery)}</strong>
          {delivery.trip ? <> · Trip {delivery.trip.tripNumber} · Vehicle {delivery.trip.vehicleId}</> : null}
          {delivery.status !== "arrived" && delivery.trip?.plannedArrivalAt ? <> · {deliveryEta(delivery).split(" · ")[0]}</> : null}
        </span>
      </div>

      <div className="next-delivery-eta">
        <span className="field-label">Items</span>
        <strong>{delivery.items.length}</strong>
        <span>{delivery.items.reduce((sum, item) => sum + item.expected, 0)} units expected</span>
      </div>

      <Button tone="secondary" className="view-details-button" onClick={onOpen}>
        View details
        <ArrowRight />
      </Button>
    </motion.div>
    )
}

export function UpcomingDeliveryRow({ delivery, onOpen }: { delivery: UpcomingDelivery, onOpen?: () => void }) {
    return (
    <motion.button
      className="upcoming-row"
      type="button"
      layout
      onClick={onOpen}
      whileTap={{ scale: 0.99 }}
      transition={calmSpring}
    >
      <span className="upcoming-record">
        <strong className="data-id">{delivery.id}</strong>
        <span>{delivery.type}</span>
      </span>
      <span className="upcoming-date">
        <CalendarDays />
        {delivery.date}
      </span>
      <span className="upcoming-status">
        <StatusPill kind={delivery.status} />
        {delivery.reason && (
          <small>
            <AlertTriangle />
            {delivery.reason}
          </small>
        )}
      </span>
      <span className="upcoming-eta">{delivery.eta}</span>
      <ArrowRight className="row-arrow" />
    </motion.button>
    )
}

export function RecentActivityList({ orders, loading }: { orders: DashboardPayload["recentOrders"], loading?: boolean }) {
    if (loading) return <p style={{ color: "var(--text-secondary)" }}>Loading…</p>;
    if (orders.length === 0) return <p style={{ color: "var(--text-secondary)" }}>No recent orders.</p>;
    return (
    <div className="activity-list">
      {orders.map((order) => {
        const kind = orderStatusKind[order.status] ?? "awaiting";
        const details = statusDetails[kind];
        return (
          <motion.button
            className="activity-row"
            type="button"
            key={order._id}
            whileTap={{ scale: 0.99 }}
            transition={calmSpring}
          >
            <span
              className={`activity-icon activity-icon--${kind}`}
              aria-hidden="true"
            >
              {details.icon}
            </span>
            <span className="activity-copy">
              <strong className="data-id">{order.orderNumber}</strong>
              <span>{details.label}</span>
            </span>
            <time>{new Date(order.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}</time>
          </motion.button>
        )
      })}
    </div>
    )
}

export function UpcomingEmptyState() {
    return (
    <motion.div
      className="upcoming-empty"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={calmSpring}
    >
      <CalendarDays />
      <div>
        <strong>No upcoming deliveries scheduled</strong>
        <p>New delivery dates will appear here once an order is scheduled.</p>
      </div>
    </motion.div>
    )
}
