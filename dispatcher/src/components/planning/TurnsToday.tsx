import { DAILY_TURN_LIMIT } from "../../lib/constants";
import type { Vehicle } from "../../types/dispatcher";
import { vehicleDay } from "./helpers";

export function TurnsToday({ vehicle }: { vehicle: Vehicle }) {
  const { turnsToday } = vehicleDay(vehicle)
  const full = turnsToday >= DAILY_TURN_LIMIT
  return (
    <span className={`turns-today ${full ? "turns-today--full" : ""}`}>
      Turns today {turnsToday} / {DAILY_TURN_LIMIT}
    </span>
  )
}
