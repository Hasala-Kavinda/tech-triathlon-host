import { Phone, UserRound } from "lucide-react"
import { useState } from "react"
import { UnstyledButton } from "./ui"
import type { Person } from "../types/dispatcher";

type DriverHoverCardProps = {
  driver: Person
  vehicleId: string
}

export function DriverHoverCard({ driver, vehicleId }: DriverHoverCardProps) {
  const [synced, setSynced] = useState(true)

  return (
    <div className="person-badge person-badge--large">
      <UnstyledButton
        aria-label={`View ${driver.name}, ${driver.role}`}
        className="person-trigger"
        onClick={() => setSynced(!synced)}
        title="Click to toggle Synced / Not synced preview"
      >
        <UserRound aria-hidden="true" size={38} />
      </UnstyledButton>
      <strong>{driver.role}</strong>

      <div className="person-card person-card--driver" role="tooltip">
        <div className="driver-card-header">
          <div className="driver-card-avatar">
            <UserRound size={26} />
          </div>
          <div className="driver-card-info">
            <strong>{driver.name}</strong>
            <span>
              {driver.role} · {vehicleId}
            </span>
            <UnstyledButton
              className="person-card__phone"
              onClick={() => {
                window.location.href = `tel:${driver.phone.replace(/ /g, "")}`
              }}
            >
              <Phone size={13} />
              {driver.phone}
            </UnstyledButton>
          </div>
        </div>

        {/* Live Mini Map */}
        <div className={`driver-map-box ${!synced ? "driver-map-box--offline" : ""}`}>
          <svg
            aria-hidden="true"
            height="110"
            style={{ width: "100%", height: "100%" }}
            viewBox="0 0 300 110"
          >
            {/* Background elements */}
            <path
              d="M 10 90 Q 90 70, 160 55 T 290 60"
              fill="none"
              stroke="#D9DDE8"
              strokeWidth="14"
            />
            {/* Completed path (green) */}
            <path
              d="M 20 60 Q 80 62, 140 55"
              fill="none"
              stroke="#00C46A"
              strokeLinecap="round"
              strokeWidth="4"
            />
            {/* Passed stop dots */}
            <circle cx="20" cy="60" fill="#00C46A" r="4" />
            <circle cx="80" cy="61" fill="#00C46A" r="4" />

            {/* Remaining path (dashed blue) */}
            <path
              d="M 140 55 Q 210 50, 275 58"
              fill="none"
              stroke="#0047FF"
              strokeDasharray="5,4"
              strokeLinecap="round"
              strokeWidth="3"
            />
            {/* Next stop pin */}
            <circle
              cx="275"
              cy="58"
              fill="white"
              r="5"
              stroke="#0047FF"
              strokeWidth="2.5"
            />

            {/* Vehicle pulse position */}
            {synced ? (
              <g transform="translate(140, 55)">
                <circle
                  fill="rgba(0, 71, 255, 0.25)"
                  r="12"
                  style={{ animation: "pulse 1.5s infinite" }}
                />
                <circle cx="0" cy="0" fill="#0047FF" r="5" stroke="white" strokeWidth="2" />
              </g>
            ) : (
              <g transform="translate(140, 55)">
                <circle cx="0" cy="0" fill="#FFC300" r="5" stroke="white" strokeWidth="2" />
              </g>
            )}
          </svg>
        </div>

        {/* Status Strip */}
        <div className="driver-status-strip">
          {synced ? (
            <>
              <div className="driver-status-live">
                <i />
                <span>Live · 12 s ago</span>
              </div>
              <div className="driver-status-speed">
                42 km/h · near Weligama
              </div>
            </>
          ) : (
            <div className="driver-status-offline">
              <span>Not synced since 10:31 · last seen near Ahangama</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
