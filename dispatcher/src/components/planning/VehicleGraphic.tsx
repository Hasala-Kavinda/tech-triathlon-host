import { Snowflake, Truck } from "lucide-react";
import type { Vehicle } from "../../types/dispatcher";

export function VehicleGraphic({
  vehicle,
  large = false,
}: {
  vehicle: Vehicle
  large?: boolean
}) {
  return (
    <div className={`vehicle-graphic ${large ? "vehicle-graphic--large" : ""}`}>
      <Truck
        aria-hidden="true"
        size={large ? 88 : vehicle.capacityKg > 2500 ? 62 : 52}
        strokeWidth={1.7}
      />
      {vehicle.type === "Refrigerated" ? (
        <Snowflake
          className="vehicle-graphic__snow"
          aria-hidden="true"
          size={16}
        />
      ) : null}
      {large ? (
        <span className="vehicle-graphic__length">↔ {vehicle.length}</span>
      ) : null}
    </div>
  )
}
