import type { EngineContext, RankedVehicle } from "@route-engine"
import { reasonLabel, reasonText, toUiVehicle } from "../../lib/routeEngine"
import { DAILY_TURN_LIMIT } from "../../lib/constants"
import { UnstyledButton } from "../ui"
import { VehicleGraphic } from "./VehicleGraphic"

/**
 * Every vehicle is shown. Ineligible ones (per the engine's `eligible: false` + `reasons`) are
 * faded AND genuinely disabled - not clickable - with the engine's reason as the caption.
 */
export function VehicleGrid({
  ranking, ctx, onPick, showFit = false, filtered = false,
}: {
  ranking: RankedVehicle[]
  ctx: EngineContext
  onPick: (vehicleId: string) => void
  showFit?: boolean
  filtered?: boolean
}) {
  return (
    <div className={`vehicle-grid ${filtered ? "vehicle-grid--filtered" : ""}`}>
      {ranking.map(({ vehicle, eligible, reasons, fitScore }) => {
        const state = ctx.vehicleState[vehicle.vehicleId]
        const ui = toUiVehicle(vehicle, state)
        return (
          <UnstyledButton
            aria-disabled={!eligible}
            className={`vehicle-card ${eligible ? "" : "vehicle-card--quota-reached"}`}
            disabled={!eligible}
            key={vehicle.vehicleId}
            onClick={() => onPick(vehicle.vehicleId)}
            title={eligible ? "Select vehicle" : reasonText(reasons)}
          >
            <VehicleGraphic vehicle={ui} />
            <strong className="data-text">{vehicle.vehicleId}</strong>
            <b>{ui.type}</b>
            {eligible ? (
              <span>{vehicle.weightCapKg.toLocaleString()} kg · {vehicle.volumeCapM3} m³ · {vehicle.depot}</span>
            ) : (
              <span className="vehicle-card__quota-text">{reasons[0] ? reasonLabel(reasons[0]) : "Unavailable"}</span>
            )}
            <span className="vehicle-card__turns">Turns today {state?.turnsToday ?? 0} / {DAILY_TURN_LIMIT}</span>
            <em>{eligible ? (showFit ? `Fit ${fitScore} · Select →` : "Select →") : "Unavailable"}</em>
          </UnstyledButton>
        )
      })}
    </div>
  )
}
