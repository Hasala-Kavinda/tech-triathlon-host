import type { RouteResult } from "@route-engine"
import { ProgressBar } from "../ui"
import type { Vehicle } from "../../types/dispatcher"

/** Weight and volume load of the current selection, straight from the engine's route evaluation. */
export function LoadBars({ route, vehicle }: { route: RouteResult; vehicle: Vehicle }) {
  const { weightKg, volumeM3, weightPct, volumePct } = route.load
  return (
    <>
      <div className="selected-card__load">
        <strong>Load {weightKg.toLocaleString()} / {vehicle.capacityKg.toLocaleString()} kg</strong>
        <b>{Math.round(weightPct)}%</b>
      </div>
      <ProgressBar value={Math.min(100, weightPct)} warning={weightPct >= 90} />
      <div className="selected-card__load selected-card__load--volume">
        <strong>Volume {volumeM3.toFixed(1)} / {vehicle.volumeM3 ?? "?"} m³</strong>
        <b>{Math.round(volumePct)}%</b>
      </div>
      <ProgressBar value={Math.min(100, volumePct)} warning={volumePct >= 90} />
    </>
  )
}
