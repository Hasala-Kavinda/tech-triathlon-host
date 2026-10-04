import { Check, Download, X } from "lucide-react"
import { Button, Heading, IconButton } from "./ui"
import type { TripMonitor } from "../api/monitor"

type RouteSummaryModalProps = {
  monitor: TripMonitor
  route: string
  onClose: () => void
}

const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" }) : "–")

function difference(planned: string | null, actual: string | null) {
  if (!planned || !actual) return { text: "–", onTime: true }
  const minutes = Math.round((new Date(actual).getTime() - new Date(planned).getTime()) / 60_000)
  if (Math.abs(minutes) < 1) return { text: "on time", onTime: true }
  return { text: `${minutes > 0 ? "+" : ""}${minutes} min`, onTime: minutes <= 0 }
}

/** Summary of a finished route, built from the trip's real stops, delivery records and remarks. */
export function RouteSummaryModal({ monitor, route, onClose }: RouteSummaryModalProps) {
  const { trip, stops, remarks, load, crew } = monitor
  const covered = stops.filter((stop) => stop.state === "delivered" || stop.state === "failed").length
  const reviewed = remarks.filter((remark) => remark.status === "reviewed").length
  const notices = remarks.filter((remark) => remark.notice).length
  const end = difference(trip.plannedEndAt, trip.completedAt)

  return (
    <div className="modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section aria-labelledby="summary-title" aria-modal="true" className="modal route-summary-modal" role="dialog">
        <div className="modal__heading">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Heading id="summary-title">Route summary</Heading>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "999px", background: "var(--emerald-500)", color: "var(--navy-900)", fontWeight: 700, fontSize: "12px" }}>
                <Check size={14} /> Done
              </span>
            </div>
            <p>{trip.vehicleId} · {route} · {trip.serviceDate}</p>
          </div>
          <IconButton icon={X} label="Close modal" onClick={onClose} />
        </div>

        <div className="summary-kpi-grid">
          <div className="summary-kpi-card">
            <small>Time</small>
            <strong>{clock(trip.startedAt)} – {clock(trip.completedAt)}</strong>
            <span>Plan {clock(trip.departureAt)} – {clock(trip.plannedEndAt)}{trip.plannedEndAt && trip.completedAt ? ` · ${end.text}` : ""}</span>
          </div>
          <div className="summary-kpi-card">
            <small>Shops</small>
            <strong style={{ color: covered === stops.length ? "var(--emerald-700)" : undefined }}>{covered} / {stops.length}</strong>
            <span className={covered === stops.length ? "success-text" : ""}>{covered === stops.length ? "all covered" : "not all covered"}</span>
          </div>
          <div className="summary-kpi-card">
            <small>Load</small>
            <strong>{load ? `${load.loadedItems} / ${load.totalItems}` : "–"}</strong>
            <span>{load ? `${load.flaggedItems} flagged` : "no load record"}</span>
          </div>
          <div className="summary-kpi-card">
            <small>Remarks</small>
            <strong>{reviewed} / {remarks.length} reviewed</strong>
            <span>{notices} notice{notices === 1 ? "" : "s"} sent</span>
          </div>
          <div className="summary-kpi-card">
            <small>Accepted</small>
            <strong>{trip.acceptedAt ? clock(trip.acceptedAt) : "Not yet"}</strong>
            <span>{trip.acceptedAt ? "by dispatcher" : "awaiting acceptance"}</span>
          </div>
        </div>

        <table className="summary-stops-table">
          <thead>
            <tr><th>Stop</th><th>Planned</th><th>Arrived</th><th>Difference</th><th>Outcome</th></tr>
          </thead>
          <tbody>
            {stops.map((stop) => {
              const diff = difference(stop.plannedArrivalAt, stop.arrivedAt)
              return (
                <tr key={stop.tripStopId}>
                  <td><strong>{stop.sequence} · {stop.outletName}</strong></td>
                  <td className="data-text">{clock(stop.plannedArrivalAt)}</td>
                  <td className="data-text" style={{ fontWeight: 700 }}>{clock(stop.arrivedAt)}</td>
                  <td><strong style={{ color: diff.onTime ? "var(--emerald-700)" : "var(--sunburst-900)" }}>{diff.text}</strong></td>
                  <td className="data-text">{stop.outcome ?? stop.state}</td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="summary-footer">
          <div className="summary-footer-crew">
            Crew: {[crew.driver ? `${crew.driver.name} (driver)` : null, ...crew.loaders.map((loader) => `${loader.name} (loader)`)].filter(Boolean).join(", ") || "not recorded"}
          </div>
          <div className="summary-footer-actions">
            <Button icon={Download} onClick={() => window.print()} variant="secondary">Download PDF</Button>
            <Button onClick={onClose} variant="primary">Close</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
