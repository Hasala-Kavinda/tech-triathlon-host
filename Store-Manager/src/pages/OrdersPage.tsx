import { Plus, Search, CalendarDays, ArrowRight } from "lucide-react";
import {  motion  } from 'motion/react';
import { useState, useEffect } from "react";
import {  Button  } from '../components/common/Button';
import { StatusPill } from "../components/common/StatusPill";
import type { StatusKind } from "../types/store";
import { calmSpring } from "../lib/constants";
import { getOrderHistory, type StoreOrder } from "../api/store";

const statusPresentation: Record<StoreOrder["status"], { label: string; kind: StatusKind; state: string }> = {
  submitted: { label: "Submitted", kind: "awaiting", state: "confirmed" },
  deferred: { label: "Deferred", kind: "deferred", state: "deferred" },
  allocated: { label: "Scheduled", kind: "scheduled", state: "confirmed" },
  in_transit: { label: "On the way", kind: "transit", state: "confirmed" },
  delivered: { label: "Delivered", kind: "received", state: "receipt-confirmed" },
  cancelled: { label: "Cancelled", kind: "issue", state: "confirmed" },
};

export function OrdersPage({ onNewOrder, onOpenOrder }: { business: "fresh" | "style" | "tech", onNewOrder: () => void, onOpenOrder: (id: string, view: string, state: string) => void }) {
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const statuses = ["All", "Submitted", "Scheduled", "On the way", "Deferred", "Delivered", "Cancelled"];
    const [orders, setOrders] = useState<StoreOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
      let cancelled = false;
      setLoading(true);
      getOrderHistory()
        .then((rows) => { if (!cancelled) { setOrders(rows); setError(null); } })
        .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load orders."); })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }, []);
    const filtered = orders.filter(o =>
            o.orderNumber.toLowerCase().includes(search.toLowerCase()) &&
            (statusFilter === "All" || statusPresentation[o.status].label === statusFilter)
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
        {loading && <p style={{ color: "var(--text-secondary)" }}>Loading orders…</p>}
        {error && <p style={{ color: "var(--text-secondary)" }}>{error}</p>}
        {!loading && !error && filtered.length > 0 ? filtered.map(order => {
          const presentation = statusPresentation[order.status];
          return (
          <motion.button
            key={order._id}
            className="upcoming-row"
            type="button"
            layout
            onClick={() => onOpenOrder(order._id, "order-detail", presentation.state)}
            whileTap={{ scale: 0.99 }}
            transition={calmSpring}
          >
            <span className="upcoming-record">
              <strong className="data-id">{order.orderNumber}</strong>
              <span>{order.orderType}</span>
            </span>
            <span className="upcoming-date">
              <CalendarDays />
              {new Date(order.requestedDate).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })}
            </span>
            <span className="upcoming-status">
              <StatusPill kind={presentation.kind} />
              <small style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span>{presentation.label}</span>
              </small>
            </span>
            <ArrowRight className="row-arrow" />
          </motion.button>
          );
        }) : (!loading && !error && (
          <div style={{ textAlign: "center", padding: "var(--space-8) 0", color: "var(--text-secondary)" }}>
            <Search style={{ margin: "0 auto var(--space-2)", opacity: 0.5, display: "block" }} />
            <p style={{ margin: 0 }}>No orders found. Try another order ID or status filter.</p>
          </div>
        ))}
      </div>
    </div>
    )
}
