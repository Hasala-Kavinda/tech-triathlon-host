import { Check, Download, X } from "lucide-react"
import { Button, Heading, IconButton } from "./ui"

type RouteSummaryModalProps = {
  vehicleId: string
  route: string
  dateStr: string
  onClose: () => void
}

const SUMMARY_STOPS = [
  { stop: "1 · Sunrise Mart", planned: "07:05", arrived: "07:10", diff: "+5 min", orders: 2 },
  { stop: "2 · Lanka Super Stores", planned: "07:50", arrived: "07:55", diff: "+5 min", orders: 1 },
  { stop: "3 · Coastal Traders", planned: "08:40", arrived: "08:40", diff: "on time", orders: 2 },
  { stop: "4 · Matara City Mart", planned: "09:45", arrived: "09:50", diff: "+5 min", orders: 1 },
]

export function RouteSummaryModal({
  vehicleId,
  route,
  dateStr,
  onClose,
}: RouteSummaryModalProps) {
  const handleDownloadPdf = () => {
    window.print()
  }

  return (
    <div
      className="modal-layer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        aria-labelledby="summary-title"
        aria-modal="true"
        className="modal route-summary-modal"
        role="dialog"
      >
        <div className="modal__heading">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Heading id="summary-title">Route summary</Heading>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: "var(--emerald-500)",
                  color: "var(--navy-900)",
                  fontWeight: 700,
                  fontSize: "12px",
                }}
              >
                <Check size={14} /> Done
              </span>
            </div>
            <p>
              {vehicleId} · {route} · {dateStr}
            </p>
          </div>
          <IconButton icon={X} label="Close modal" onClick={onClose} />
        </div>

        {/* 5 KPI Cards */}
        <div className="summary-kpi-grid">
          <div className="summary-kpi-card">
            <small>Time</small>
            <strong>06:32 – 10:05</strong>
            <span>Plan 06:30 – 10:00 · +5 min</span>
          </div>
          <div className="summary-kpi-card">
            <small>Shops</small>
            <strong style={{ color: "var(--emerald-700)" }}>4 / 4</strong>
            <span className="success-text">all covered</span>
          </div>
          <div className="summary-kpi-card">
            <small>Orders</small>
            <strong>6 delivered</strong>
            <span>1,180 kg</span>
          </div>
          <div className="summary-kpi-card">
            <small>Distance</small>
            <strong>86 km</strong>
            <span>fuel used 18%</span>
          </div>
          <div className="summary-kpi-card">
            <small>Remarks</small>
            <strong>3 reviewed</strong>
            <span>3 notices sent</span>
          </div>
        </div>

        {/* Stops Table */}
        <table className="summary-stops-table">
          <thead>
            <tr>
              <th>Stop</th>
              <th>Planned</th>
              <th>Arrived</th>
              <th>Difference</th>
              <th>Orders</th>
            </tr>
          </thead>
          <tbody>
            {SUMMARY_STOPS.map((s) => (
              <tr key={s.stop}>
                <td>
                  <strong>{s.stop}</strong>
                </td>
                <td className="data-text">{s.planned}</td>
                <td className="data-text" style={{ fontWeight: 700 }}>
                  {s.arrived}
                </td>
                <td>
                  <strong
                    style={{
                      color:
                        s.diff === "on time"
                          ? "var(--emerald-700)"
                          : "var(--sunburst-900)",
                    }}
                  >
                    {s.diff}
                  </strong>
                </td>
                <td className="data-text">{s.orders}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="summary-footer">
          <div className="summary-footer-crew">
            Crew: Driver, Loader, Loader · Accepted by dispatcher at 10:20
          </div>
          <div className="summary-footer-actions">
            <Button
              icon={Download}
              onClick={handleDownloadPdf}
              variant="secondary"
            >
              Download PDF
            </Button>
            <Button onClick={onClose} variant="primary">
              Close
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
