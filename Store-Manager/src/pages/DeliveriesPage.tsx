import { CalendarDays, ArrowRight, CheckCircle2 } from "lucide-react";
import {  motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {  StoreDelivery, storeDeliveryApi  } from '../api/store';
import {  Button  } from '../components/common/Button';
import { StatusPill } from "../components/common/StatusPill";
import {  formatOrderType, getDefaultOrderType  } from '../lib/utils';
import type { StatusKind } from "../types/store";
import { calmSpring } from "../lib/constants";

export function DeliveriesPage({ business, onOpenOrder }: { business: "fresh" | "style" | "tech", onOpenOrder: (id: string, view: string, state: string) => void }) {
    const [liveDeliveries, setLiveDeliveries] = useState<StoreDelivery[]>([]);
    const [issuedPin, setIssuedPin] = useState<{ deliveryId: string; pin: string; expiresAt: string } | null>(null);
    const [liveError, setLiveError] = useState("");
    const prototypeMode = import.meta.env.VITE_ALLOW_UNAUTHENTICATED_PROTOTYPE === "true";
    useEffect(() => {
    if (prototypeMode) return
    void storeDeliveryApi.list().then(setLiveDeliveries).catch((error) => setLiveError(error instanceof Error ? error.message : "Unable to load deliveries."))
    }, [prototypeMode])

    async function issuePin(delivery: StoreDelivery) {
        try {
          const result = await storeDeliveryApi.issuePin(delivery._id)
          setIssuedPin({ deliveryId: delivery._id, ...result })
          setLiveError("")
        } catch (error) {
          setLiveError(error instanceof Error ? error.message : "Unable to issue a PIN.")
        }
    }

    async function confirmReceipt(delivery: StoreDelivery) {
        if (!window.confirm("Confirm that the full delivery was received with no issues?")) return
        try {
          const updated = await storeDeliveryApi.confirmFullReceipt(delivery)
          setLiveDeliveries((current) => current.map((item) => item._id === updated._id ? updated : item))
          setLiveError("")
        } catch (error) {
          setLiveError(error instanceof Error ? error.message : "Unable to confirm the receipt.")
        }
    }

    const deliveries = [
            { section: "Needs attention", id: "ORD-1045", type: "", date: "", statusLabel: "Awaiting confirmation", status: "awaiting" as StatusKind, subtext: "Driver completed delivery at 06:52", view: "verify-delivery", state: "verify" },
            { section: "Upcoming", id: "ORD-1062", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Tomorrow · Thursday, 1 October", statusLabel: "Scheduled", status: "scheduled" as StatusKind, eta: "Expected arrival 06:40–07:00", subtext: "Trip PLG-03 · Vehicle WP-014", view: "order-detail", state: "scheduled" },
            { section: "Upcoming", id: "ORD-1065", type: formatOrderType(business || "fresh", business === "fresh" ? "chilled" : getDefaultOrderType(business || "fresh")), date: "Friday, 2 October", statusLabel: "Deferred", status: "deferred" as StatusKind, subtext: "New date Friday, 2 October", view: "order-detail", state: "deferred" },
            { section: "In progress", id: "ORD-1082", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "", statusLabel: "On the way", status: "transit" as StatusKind, eta: "Expected arrival 06:40–07:00", subtext: "Departed 05:48", view: "order-detail", state: "on-way" },
            { section: "Recent", id: "ORD-1037", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Today · 06:57", statusLabel: "Receipt confirmed", status: "received" as StatusKind, view: "order-detail", state: "receipt-confirmed" },
            { section: "Recent", id: "ORD-1034", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Yesterday", statusLabel: "Receipt confirmed with issue", status: "issue" as StatusKind, view: "order-detail", state: "receipt-issue" },
          ];
    const sections = ["Needs attention", "In progress", "Upcoming", "Recent"];
    return (
    <div className="">
      <div className="page-header">
        <div>
          <div className="page-title">Deliveries</div>
          <p>See upcoming, active, and recently completed deliveries for your store.</p>
        </div>
      </div>

      <div style={{ marginTop: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
        {!prototypeMode ? (
          <section>
            <span className="eyebrow" style={{ display: "block", marginBottom: "var(--space-3)" }}>Live deliveries</span>
            {liveError ? <div className="work-alert" role="alert">{liveError}</div> : null}
            {issuedPin ? (
              <div className="work-alert" role="status">
                Delivery PIN <strong className="data-id" style={{ fontSize: 22 }}>{issuedPin.pin}</strong> · expires {new Date(issuedPin.expiresAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            ) : null}
            <div className="upcoming-list">
              {liveDeliveries.map((delivery) => (
                <div className="upcoming-row" key={delivery._id}>
                  <span className="upcoming-record"><strong className="data-id">{delivery._id.slice(-8).toUpperCase()}</strong><span>{delivery.items.length} products</span></span>
                  <span className="upcoming-date">{delivery.arrivedAt ? new Date(delivery.arrivedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Scheduled"}</span>
                  <span className="upcoming-status"><strong>{delivery.status.split("_").join(" ")}</strong></span>
                  {delivery.status === "arrived" ? <Button onClick={() => void issuePin(delivery)}>Issue PIN</Button> : null}
                  {delivery.status === "delivered" && !delivery.receipt ? <Button onClick={() => void confirmReceipt(delivery)}>Confirm receipt</Button> : null}
                </div>
              ))}
              {!liveDeliveries.length && !liveError ? <p>No live deliveries for this outlet.</p> : null}
            </div>
          </section>
        ) : null}
        {prototypeMode ? sections.map(section => {
          const items = deliveries.filter(d => d.section === section)
          if (items.length === 0) return null
          return (
            <section key={section}>
              <span className="eyebrow" style={{ display: "block", marginBottom: "var(--space-3)" }}>{section}</span>
              <div className="upcoming-list">
                {items.map(order => (
                  <motion.button
                    key={order.id}
                    className="upcoming-row"
                    type="button"
                    layout
                    onClick={() => onOpenOrder(order.id, order.view, order.state)}
                    whileTap={{ scale: 0.99 }}
                    transition={calmSpring}
                  >
                    <span className="upcoming-record">
                      <strong className="data-id">{order.id}</strong>
                      {order.type && <span>{order.type}</span>}
                    </span>
                    <span className="upcoming-date">
                      {order.date ? (
                        <>
                          <CalendarDays />
                          {order.date}
                        </>
                      ) : null}
                    </span>
                    <span className="upcoming-status">
                      <StatusPill kind={order.status} />
                      {(order.eta || order.subtext) && (
                        <small style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          {order.eta && <span>{order.eta}</span>}
                          {order.subtext && <span style={{ opacity: 0.8 }}>{order.subtext}</span>}
                        </small>
                      )}
                    </span>
                    <ArrowRight className="row-arrow" />
                  </motion.button>
                ))}
              </div>
            </section>
          )
        }) : null}
        {deliveries.filter(d => d.section === "Needs attention").length === 0 && (
          <div style={{ textAlign: "center", padding: "var(--space-8) 0", color: "var(--text-secondary)" }}>
            <CheckCircle2 style={{ margin: "0 auto var(--space-2)", opacity: 0.5, display: "block" }} />
            <p style={{ margin: 0 }}>No deliveries need attention. Everything is up to date.</p>
          </div>
        )}
      </div>
    </div>
    )
}
