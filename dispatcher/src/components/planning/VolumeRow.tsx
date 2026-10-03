import { ProgressBar } from "../../components/ui";
import type { Vehicle } from "../../types/dispatcher";
import { vehicleDay } from "./helpers";

export function VolumeRow({ vehicle, used }: { vehicle: Vehicle; used: number }) {
  const total = vehicleDay(vehicle).volumeM3
  const percent = Math.round((used / total) * 100)
  return (
    <>
      <div className="selected-card__load selected-card__load--volume">
        <strong>
          Volume {used.toFixed(1)} / {total} m³
        </strong>
        <b>{percent}%</b>
      </div>
      <ProgressBar value={percent} warning={percent >= 90} />
    </>
  )
}
