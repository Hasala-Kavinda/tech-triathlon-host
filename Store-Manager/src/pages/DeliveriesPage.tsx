import React, { useState, useEffect } from "react";
import {  StoreDelivery, storeDeliveryApi  } from '../api/store';
import {  Button  } from '../components/common/Button';

export function DeliveriesPage({ business, onOpenOrder }: { business: "fresh" | "style" | "tech", onOpenOrder: (id: string, view: string, state: string) => void }) {
    const [liveDeliveries, setLiveDeliveries] = useState<StoreDelivery[]>([]);
    const [issuedPin, setIssuedPin] = useState<{ deliveryId: string; pin: string; expiresAt: string } | null>(null);
    const [liveError, setLiveError] = useState("");
    useEffect(() => {
      void storeDeliveryApi.list().then(setLiveDeliveries).catch((error) => setLiveError(error instanceof Error ? error.message : "Unable to load deliveries."))
    }, [])

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

    return (
    <div className="">
      <div className="page-header">
        <div>
          <div className="page-title">Deliveries</div>
          <p>See upcoming, active, and recently completed deliveries for your store.</p>
        </div>
      </div>

      <div style={{ marginTop: "var(--space-6)", display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
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
      </div>
    </div>
    )
}
