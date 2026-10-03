import { Plus, Search, CalendarDays, ArrowRight } from "lucide-react";
import {  motion  } from 'motion/react';
import React, { useState, useEffect, useMemo, useCallback } from "react";
import {  Button  } from '../components/common/Button';
import { StatusPill } from "../components/common/StatusPill";
import {  formatOrderType, getDefaultOrderType  } from '../lib/utils';
import type { StatusKind } from "../types/store";
import { calmSpring } from "../lib/constants";

export function OrdersPage({ business, onNewOrder, onOpenOrder }: { business: "fresh" | "style" | "tech", onNewOrder: () => void, onOpenOrder: (id: string, view: string, state: string) => void }) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const statuses = [
            "All", "Order confirmed", "Scheduled", "On the way", 
            "Deferred", "Awaiting confirmation", "Receipt confirmed"
          ];
    const orders = [
            { id: "ORD-1082", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Thursday, 1 October", statusLabel: "Order confirmed", status: "confirmed" as StatusKind, view: "order-detail", state: "confirmed" },
            { id: "ORD-1065", type: formatOrderType(business || "fresh", business === "fresh" ? "chilled" : getDefaultOrderType(business || "fresh")), date: "Friday, 2 October", statusLabel: "Deferred", status: "deferred" as StatusKind, subtext: business === "fresh" ? "Refrigerated capacity" : "Vehicle capacity constraints", view: "order-detail", state: "deferred" },
            { id: "ORD-1062", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Thursday, 1 October", statusLabel: "Scheduled", status: "scheduled" as StatusKind, eta: "Expected arrival 06:40–07:00", view: "order-detail", state: "scheduled" },
            { id: "ORD-1071", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Monday, 5 October", statusLabel: "Order confirmed", status: "confirmed" as StatusKind, eta: "Not scheduled yet", view: "order-detail", state: "confirmed" },
            { id: "ORD-1045", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Today", statusLabel: "Awaiting confirmation", status: "awaiting" as StatusKind, subtext: "Driver completed delivery at 06:52", view: "verify-delivery", state: "verify" },
            { id: "ORD-1037", type: formatOrderType(business || "fresh", getDefaultOrderType(business || "fresh")), date: "Today · 06:57", statusLabel: "Receipt confirmed", status: "received" as StatusKind, view: "order-detail", state: "receipt-confirmed" }
          ];
    const filtered = orders.filter(o => 
            o.id.toLowerCase().includes(search.toLowerCase()) && 
            (statusFilter === "All" || o.statusLabel === statusFilter)
          );
    return (
    <div className="list-container">
      <div className="home-page-header">
        <div>
          <div className="page-title">Orders</div>
          <p>Track your store orders from submission through delivery.</p>
        </div>
          <Button icon={<Plus />} tone="primary" onClick={onNewOrder}>
            New order
          </Button>
        </div>

      <div style={{ marginTop: "var(--space-6)" }}>
        <label className="field" style={{ marginBottom: 16 }}>
          <span className="input-wrap input-wrap--icon">
            <Search />
            <input 
              placeholder="Search by order ID" 
              value={search} 
              onChange={(e) => setSearch(e.target.value)} 
            />
          </span>
        </label>
        
        <div className="pill-collection hide-scrollbar" style={{ flexWrap: 'nowrap', overflowX: 'auto', marginBottom: 12 }}>
          {statuses.map(s => (
            <button
              key={s}
              type="button"
              style={{
                minHeight: 30, padding: "0 var(--space-3)", border: "1px solid var(--border)", borderRadius: "var(--radius-pill)",
                color: statusFilter === s ? "var(--cobalt-600)" : "var(--text-secondary)", 
                background: statusFilter === s ? "var(--cobalt-50)" : "var(--white)",
                borderColor: statusFilter === s ? "var(--cobalt-500)" : "var(--border)",
                fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
                cursor: "pointer"
              }}
              onClick={() => setStatusFilter(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="upcoming-list" style={{ marginTop: "var(--space-6)" }}>
        {filtered.length > 0 ? filtered.map(order => (
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
              <span>{order.type}</span>
            </span>
            <span className="upcoming-date">
              <CalendarDays />
              {order.date}
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
        )) : (
          <div style={{ textAlign: "center", padding: "var(--space-8) 0", color: "var(--text-secondary)" }}>
            <Search style={{ margin: "0 auto var(--space-2)", opacity: 0.5, display: "block" }} />
            <p style={{ margin: 0 }}>No orders found. Try another order ID or status filter.</p>
          </div>
        )}
      </div>
    </div>
    )
}
