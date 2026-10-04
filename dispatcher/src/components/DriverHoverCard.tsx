import { Phone, UserRound } from "lucide-react"
import { useState } from "react"
import { UnstyledButton } from "./ui"
import type { Contact, MonitorStop, TripMonitor } from "../api/monitor"

type DriverHoverCardProps = {
  driver: Contact | null
  vehicleId: string
  tracking: TripMonitor["tracking"]
  stops: MonitorStop[]
}

const clock = (iso: string | null) => (iso ? new Date(iso).toLocaleTimeString("en-GB", { timeZone: "Asia/Colombo", hour: "2-digit", minute: "2-digit" }) : "–")

function ago(seconds: number) {
  if (seconds < 90) return `${seconds} s ago`
  if (seconds < 5400) return `${Math.round(seconds / 60)} min ago`
  return `${Math.round(seconds / 3600)} h ago`
}

/** Driver avatar: hover shows who they are and how to reach them, click shows the real last tracked position. */
export function DriverHoverCard({ driver, vehicleId, tracking, stops }: DriverHoverCardProps) {
  const [showMap, setShowMap] = useState(false)
  const name = driver?.name ?? "Driver not found"
  const hasPosition = tracking.latitude !== null && tracking.longitude !== null
  // "Synced" is the real tracking state: a point arrived within the live window.
  const synced = tracking.state === "live"

  return (
    <div className="person-badge person-badge--large">
      <UnstyledButton
        aria-expanded={showMap}
        aria-label={`View ${name}, Driver`}
        className="person-trigger"
        onClick={() => setShowMap((open) => !open)}
        title="Click to show the live position"
      >
        <UserRound aria-hidden="true" size={38} />
      </UnstyledButton>
      <strong>Driver</strong>

      <div className="person-card person-card--driver" role="tooltip">
        <div className="driver-card-header">
          <div className="driver-card-avatar">
            <UserRound size={26} />
          </div>
          <div className="driver-card-info">
            <strong>{name}</strong>
            <span>Driver · {vehicleId}{driver ? ` · ${driver.employeeId}` : ""}</span>
            {driver?.phoneE164 ? (
              <UnstyledButton className="person-card__phone" onClick={() => { window.location.href = `tel:${driver.phoneE164}` }}>
                <Phone size={13} />
                {driver.phoneE164}
              </UnstyledButton>
            ) : (
              <span className="mute" style={{ fontSize: 12 }}>No phone on file</span>
            )}
          </div>
        </div>

        {showMap ? (
          <>
            <div className={`driver-map-box ${synced ? "" : "driver-map-box--offline"}`}>
              {hasPosition ? (
                <svg aria-label="Last tracked position" height="110" style={{ width: "100%", height: "100%" }} viewBox="0 0 300 110">
                  {/* The route as its real stops: covered stops green, remaining stops dashed blue. */}
                  {stops.map((stop, index) => {
                    const x = stops.length === 1 ? 150 : 20 + (260 * index) / (stops.length - 1)
                    const covered = stop.state === "delivered" || stop.state === "failed"
                    return (
                      <g key={stop.tripStopId}>
                        {index > 0 ? <line stroke={covered ? "#00C46A" : "#0047FF"} strokeDasharray={covered ? undefined : "5,4"} strokeWidth="3" x1={20 + (260 * (index - 1)) / (stops.length - 1)} x2={x} y1="88" y2="88" /> : null}
                        <circle cx={x} cy="88" fill={covered ? "#00C46A" : "white"} r="5" stroke={covered ? "#00C46A" : "#0047FF"} strokeWidth="2.5" />
                      </g>
                    )
                  })}
                  <g transform="translate(150, 38)">
                    {synced ? <circle fill="rgba(0, 71, 255, 0.25)" r="12" style={{ animation: "pulse 1.5s infinite" }} /> : null}
                    <circle cx="0" cy="0" fill={synced ? "#0047FF" : "#FFC300"} r="5" stroke="white" strokeWidth="2" />
                  </g>
                  <text fill="#4B5568" fontSize="10" textAnchor="middle" x="150" y="16">
                    {tracking.latitude!.toFixed(4)}, {tracking.longitude!.toFixed(4)}
                  </text>
                </svg>
              ) : (
                <p className="mute" style={{ padding: 12, fontSize: 12 }}>{tracking.state === "completed" ? "Route finished · no live position" : "No position received from this driver yet."}</p>
              )}
            </div>

            <div className="driver-status-strip">
              {tracking.state === "completed" ? (
                <div className="driver-status-offline"><span>Route completed{hasPosition && tracking.recordedAt ? ` · last position ${clock(tracking.recordedAt)}` : ""}</span></div>
              ) : tracking.state === "offline_unknown" ? (
                <div className="driver-status-offline"><span>Not synced · no position received yet</span></div>
              ) : synced ? (
                <>
                  <div className="driver-status-live"><i /><span>Live · {ago(tracking.lastSeenSecondsAgo ?? 0)}</span></div>
                  <div className="driver-status-speed">{tracking.speedKmh === null ? "speed unknown" : `${tracking.speedKmh} km/h`}{tracking.nearLabel ? ` · ${tracking.nearLabel}` : ""}</div>
                </>
              ) : (
                <div className="driver-status-offline"><span>Not synced since {clock(tracking.recordedAt)}{tracking.nearLabel ? ` · last seen ${tracking.nearLabel}` : ""}</span></div>
              )}
            </div>
          </>
        ) : null}
      </div>
    </div>
  )
}
