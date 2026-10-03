import { Check, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { DriverHoverCard } from "../components/DriverHoverCard";
import { PersonBadge } from "../components/planning/PersonBadge";
import { VehicleGraphic } from "../components/planning/VehicleGraphic";
import { RemarksModal } from "../components/RemarksModal";
import { RouteSummaryModal } from "../components/RouteSummaryModal";
import { Button, PageTitle, ProgressBar } from "../components/ui";
import { people } from "../lib/constants";
import type { Remark } from "../types/dispatcher";
export default function MonitorPage({
  remarks,
  setRemarks,
  onApprove,
}: {
  remarks: Remark[]
  setRemarks: React.Dispatch<React.SetStateAction<Remark[]>>
  onApprove: (message: string) => void
}) {
  const params = new URLSearchParams(window.location.search)
  const completed = params.get("state") === "completed"
  const remarksParam = params.get("remarks") === "open"

  const [remarksModalOpen, setRemarksModalOpen] = useState(remarksParam)
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)

  const vehicleId = completed ? "SP ND-4417" : "WP LB-4521"
  const routeName = completed
    ? "Galle → Matara · Southern 05"
    : "Galle → Matara · Southern 03"

  const unreviewedCount = remarks.filter((r) => !r.reviewed).length
  const allRemarksReviewed = unreviewedCount === 0

  const stops = completed
    ? [
      { shop: "Sunrise Mart", address: "Lighthouse St, Galle Fort", time: "07:10", arrived: true, person: people.sunriseManager },
      { shop: "Lanka Super Stores", address: "Main St, Unawatuna", time: "07:55", arrived: true, person: people.lankaManager },
      { shop: "Coastal Traders", address: "Galle Rd, Weligama", time: "08:40", arrived: true, person: people.coastalManager },
      { shop: "Matara City Mart", address: "Anagarika Dharmapala Mw, Matara", time: "09:50", arrived: true, person: people.lankaManager },
    ]
    : [
      { shop: "Sunrise Mart", address: "Lighthouse St, Galle Fort", time: "08:55", arrived: true, person: people.sunriseManager },
      { shop: "Lanka Super Stores", address: "Main St, Unawatuna", time: "09:40", arrived: true, person: people.lankaManager },
      { shop: "Coastal Traders", address: "Galle Rd, Weligama", time: "10:20", arrived: true, person: people.coastalManager },
      { shop: "Matara City Mart", address: "Anagarika Dharmapala Mw, Matara", time: "11:35", arrived: false, nextStop: true },
    ]

  return (
    <section className="page page-enter monitor-page">
      <div className="page-heading">
        <div>
          <PageTitle>Route monitoring</PageTitle>
        </div>
        <div className="page-heading__meta">
          {completed ? (
            "Completed route · read only"
          ) : (
            <span style={{ color: "var(--navy-900)", fontWeight: 600 }}>
              Live route · on time
            </span>
          )}
        </div>
      </div>

      <div className="workspace-card monitor-workspace">
        {/* Left Column: Route and Stop Timeline */}
        <section className="monitor-route">
          <div className="monitor-route__heading">
            <VehicleGraphic
              large
              vehicle={{
                id: vehicleId,
                type: "Lorry",
                capacityKg: 2000,
                length: "6.1 m",
                turns: 0,
                turnQuota: 0,
                km: 0,
                kmQuota: 0,
                fuel: 0,
              }}
            />
            <div>
              <strong className="monitor-route__id">{vehicleId}</strong>
              <span>Route: {routeName}</span>
            </div>
          </div>

          <div className={`stop-timeline ${completed ? "stop-timeline--completed" : ""}`}>
            <div className="stop-timeline__head">
              <span>Shop</span>
              <span>Time</span>
              <span>Stock manager</span>
            </div>

            {stops.map((stop) => (
              <div
                className={`stop-row ${stop.arrived ? "stop-row--visited" : ""}`}
                key={stop.shop}
              >
                <span className="stop-row__marker">
                  {stop.arrived ? (
                    <Check aria-hidden="true" size={22} />
                  ) : (
                    <span
                      style={{
                        width: "14px",
                        height: "14px",
                        borderRadius: "50%",
                        border: "2px solid var(--cobalt-500)",
                      }}
                    />
                  )}
                </span>
                <span className="stop-row__shop">
                  <strong>{stop.shop}</strong>
                  <span>{stop.address}</span>
                </span>
                <span className="stop-row__time">
                  <b style={{ color: stop.arrived ? "var(--emerald-700)" : "var(--cobalt-500)" }}>
                    {stop.time}
                  </b>
                  <small style={{ display: "block", fontSize: "11px", color: "var(--text-secondary)" }}>
                    {stop.arrived ? "arrived" : "est. arrival"}
                  </small>
                </span>
                <span className="stop-row__manager">
                  {stop.person ? (
                    <PersonBadge person={stop.person} size="small" />
                  ) : stop.nextStop ? (
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "999px",
                        background: "var(--cobalt-50)",
                        color: "var(--cobalt-500)",
                        fontWeight: 700,
                        fontSize: "12px",
                      }}
                    >
                      Next stop
                    </span>
                  ) : (
                    "Not visited"
                  )}
                </span>
              </div>
            ))}
          </div>

          {/* Route Summary Trigger Button */}
          <div style={{ marginTop: "28px" }}>
            <Button
              disabled={!completed}
              onClick={() => setSummaryModalOpen(true)}
              variant={completed ? "primary" : "secondary"}
            >
              📖 Route summary {completed ? "" : "· after the route finishes"}
            </Button>
          </div>
        </section>

        {/* Right Column: Status, Crew, Remarks */}
        <section className="monitor-details">
          {/* Route Status Card */}
          <div className="route-status">
            <div className="route-status__top">
              <strong>Route status</strong>
              <span className={completed ? "route-status__done" : ""}>
                {completed ? "✓ Done" : "In progress"}
              </span>
            </div>
            <div className="route-status__metric">
              <strong className="data-text">{completed ? "4/4" : "3/4"}</strong>
              <b>shops covered</b>
            </div>
            <div style={{ margin: "10px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", marginBottom: "4px" }}>
                <span>Started {completed ? "06:32" : "08:15"}</span>
                <span>{completed ? "Ended 10:05" : "Est. end 12:05"}</span>
              </div>
              <span className={completed ? "completed-progress" : ""}>
                <ProgressBar value={completed ? 100 : 75} />
              </span>
            </div>
            <p>
              {completed ? (
                <span style={{ color: "var(--emerald-700)", fontWeight: 600 }}>
                  Finished 5 min after plan · all 4 shops covered
                </span>
              ) : (
                <span>
                  Now 10:42 · next stop at 11:35 ·{" "}
                  <strong style={{ color: "var(--emerald-700)" }}>on time</strong>
                </span>
              )}
            </p>
          </div>

          {/* Crew Panel */}
          <div className="crew-panel">
            <strong>Crew</strong>
            <div className="crew-list">
              <DriverHoverCard driver={people.driver} vehicleId={vehicleId} />
              <PersonBadge person={people.loaderOne} showRole size="large" />
              <PersonBadge person={people.loaderTwo} showRole size="large" />
            </div>
          </div>

          {/* Remarks Block */}
          <div
            className="remarks-bar"
            onClick={() => setRemarksModalOpen(true)}
            style={{ cursor: "pointer", marginTop: "14px" }}
          >
            <strong>
              Remarks <span>{remarks.length}</span>
            </strong>
            <span>
              {completed ? (
                <span style={{ color: "var(--emerald-700)" }}>3 of 3 reviewed</span>
              ) : (
                `${remarks.filter((r) => r.reviewed).length} of ${remarks.length} reviewed`
              )}
            </span>
            <span style={{ color: "var(--cobalt-500)", fontWeight: 700, marginLeft: "12px" }}>
              {completed ? "View →" : "Review →"}
            </span>
          </div>

          {/* Accept route button or Accepted stamp */}
          {completed ? (
            <div className="approved-stamp">
              <CheckCircle2 aria-hidden="true" size={22} />
              <span>Accepted · 10:20</span>
            </div>
          ) : (
            <Button
              className="approve-button"
              disabled={!allRemarksReviewed}
              onClick={() => onApprove(`Route ${vehicleId} accepted`)}
              variant={allRemarksReviewed ? "confirm" : "secondary"}
            >
              {allRemarksReviewed ? "✓ Accept route" : "Accept route"}
            </Button>
          )}
        </section>
      </div>

      {/* Remarks Review Modal */}
      {remarksModalOpen ? (
        <RemarksModal
          onClose={() => setRemarksModalOpen(false)}
          onUpdateRemarks={setRemarks}
          remarks={remarks}
          vehicleId={vehicleId}
        />
      ) : null}

      {/* Route Summary Modal */}
      {summaryModalOpen ? (
        <RouteSummaryModal
          dateStr="Sun 27 Sep"
          onClose={() => setSummaryModalOpen(false)}
          route={routeName}
          vehicleId={vehicleId}
        />
      ) : null}
    </section>
  )
}
