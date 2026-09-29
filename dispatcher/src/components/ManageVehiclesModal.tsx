import { AlertTriangle, X } from "lucide-react"
import { useState } from "react"
import type { Vehicle } from "../data/sampleData"
import { Button, Heading, IconButton } from "./ui"

type ManageVehiclesModalProps = {
  vehicles: Vehicle[]
  onClose: () => void
  onSubmit: (updated: Vehicle[]) => void
  /** Turns already done today, by vehicle id. */
  turnsToday?: Record<string, number>
  /** Most turns a vehicle may do in one day. */
  dailyTurnLimit?: number
  /** Load volume in m³, by vehicle id. */
  volumes?: Record<string, number>
}

export function ManageVehiclesModal({
  vehicles: initialList,
  onClose,
  onSubmit,
  turnsToday = {},
  dailyTurnLimit = 2,
  volumes = {},
}: ManageVehiclesModalProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(() =>
    initialList.map((v) => ({ ...v })),
  )

  const handleQuotaChange = (
    id: string,
    field: "turnQuota" | "kmQuota",
    val: string,
  ) => {
    const num = Number.parseInt(val) || 0
    setVehicles((prev) =>
      prev.map((v) => (v.id === id ? { ...v, [field]: num } : v)),
    )
  }

  const today = (id: string) => turnsToday[id] ?? 0
  const quotaReachedVehicles = vehicles.filter(
    (v) => v.turns >= v.turnQuota || v.km >= v.kmQuota,
  )
  const dayLimitVehicles = vehicles.filter(
    (v) =>
      today(v.id) >= dailyTurnLimit &&
      !(v.turns >= v.turnQuota || v.km >= v.kmQuota),
  )

  return (
    <div
      className="modal-layer"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        aria-labelledby="manage-title"
        aria-modal="true"
        className="modal manage-vehicles-modal"
        role="dialog"
      >
        <div className="modal__heading">
          <div>
            <Heading id="manage-title">Manage vehicles</Heading>
            <p>This week · Mon 21 – Sun 27 Sep · max {dailyTurnLimit} turns per vehicle per day</p>
          </div>
          <IconButton icon={X} label="Close modal" onClick={onClose} />
        </div>

        <table className="manage-vehicles-table">
          <thead>
            <tr>
              <th>Vehicle</th>
              <th>Turns (today)</th>
              <th>Turns (week)</th>
              <th>Km (week)</th>
              <th>Fuel left</th>
              <th>Weekly quota</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => {
              const isTurnOver = v.turns >= v.turnQuota
              const isKmOver = v.km >= v.kmQuota
              const isAtQuota = isTurnOver || isKmOver
              const doneToday = today(v.id)
              const isDayLimit = doneToday >= dailyTurnLimit
              const isLowFuel = v.fuel < 30
              const orig = initialList.find((item) => item.id === v.id)!
              const isTurnEdited = v.turnQuota !== orig.turnQuota
              const isKmEdited = v.kmQuota !== orig.kmQuota

              return (
                <tr
                  className={
                    isAtQuota
                      ? "manage-vehicles-row--quota"
                      : isDayLimit
                        ? "manage-vehicles-row--day-limit"
                        : ""
                  }
                  key={v.id}
                >
                  <td>
                    <strong className="data-text" style={{ fontSize: "14px", display: "block" }}>
                      {v.id}
                    </strong>
                    <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
                      {v.type}
                      {volumes[v.id] ? ` · ${volumes[v.id]} m³` : ""}
                    </span>
                  </td>
                  <td>
                    <strong
                      className="data-text"
                      style={{
                        color: isDayLimit ? "var(--sunburst-900)" : "inherit",
                        fontSize: "14px",
                      }}
                    >
                      {doneToday} / {dailyTurnLimit}
                    </strong>
                    <span
                      style={{
                        display: "block",
                        color: "var(--text-secondary)",
                        fontSize: "12px",
                      }}
                    >
                      {isDayLimit ? "free tomorrow" : `${dailyTurnLimit - doneToday} left today`}
                    </span>
                  </td>
                  <td>
                    <strong
                      className="data-text"
                      style={{
                        color: isTurnOver ? "var(--critical-500)" : "inherit",
                        fontSize: "14px",
                      }}
                    >
                      {v.turns} / {v.turnQuota}
                    </strong>
                  </td>
                  <td>
                    <strong
                      className="data-text"
                      style={{
                        color: isKmOver ? "var(--critical-500)" : "inherit",
                        fontSize: "14px",
                      }}
                    >
                      {v.km.toLocaleString()} / {v.kmQuota.toLocaleString()}
                    </strong>
                  </td>
                  <td>
                    <div className="manage-fuel-bar">
                      <div className="manage-fuel-track">
                        <div
                          className={`manage-fuel-fill ${isLowFuel ? "manage-fuel-fill--low" : ""}`}
                          style={{ width: `${v.fuel}%` }}
                        />
                      </div>
                      <span
                        className="data-text"
                        style={{
                          fontSize: "12px",
                          fontWeight: 700,
                          color: isLowFuel ? "var(--critical-500)" : "inherit",
                        }}
                      >
                        {v.fuel}%
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className="manage-quota-inputs">
                      <div
                        className={`manage-quota-input ${isTurnEdited ? "manage-quota-input--edited" : ""}`}
                      >
                        <input
                          aria-label={`${v.id} turn quota`}
                          onChange={(e) =>
                            handleQuotaChange(v.id, "turnQuota", e.target.value)
                          }
                          type="number"
                          value={v.turnQuota}
                        />
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          turns
                        </span>
                      </div>
                      <div
                        className={`manage-quota-input ${isKmEdited ? "manage-quota-input--edited" : ""}`}
                      >
                        <input
                          aria-label={`${v.id} km quota`}
                          onChange={(e) =>
                            handleQuotaChange(v.id, "kmQuota", e.target.value)
                          }
                          type="number"
                          value={v.kmQuota}
                        />
                        <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                          km
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    {isAtQuota ? (
                      <span className="status-badge status-badge--quota">
                        Quota reached
                      </span>
                    ) : isDayLimit ? (
                      <span className="status-badge status-badge--day-limit">
                        Day limit
                      </span>
                    ) : (
                      <span className="status-badge status-badge--can-go">
                        Can go
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        <div className="manage-vehicles-footer">
          <div className="manage-vehicles-warning">
            {quotaReachedVehicles.length > 0 || dayLimitVehicles.length > 0 ? (
              <>
                <AlertTriangle size={18} color="var(--sunburst-500)" />
                <span>
                  {quotaReachedVehicles.length > 0
                    ? `${quotaReachedVehicles.map((v) => v.id).join(", ")} at weekly quota. `
                    : ""}
                  {dayLimitVehicles.length > 0
                    ? `${dayLimitVehicles.map((v) => v.id).join(", ")} did ${dailyTurnLimit} turns today (max ${dailyTurnLimit}) and is free again tomorrow.`
                    : ""}
                </span>
              </>
            ) : (
              <span style={{ color: "var(--emerald-700)", fontWeight: 600 }}>
                All vehicles are within quota and available for scheduling.
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button onClick={() => onSubmit(vehicles)} variant="primary">
              Submit quota
            </Button>
          </div>
        </div>
      </section>
    </div>
  )
}
