import { readFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { buildAllowanceTable, buildTravelTable, EngineDataError, parseCsv } from "../tables.js"
import type { AllowanceTable, Brand, DockType, EngineOutlet, EngineVehicle, ParkingConstraint, TravelTable } from "../types.js"

export interface DriveData {
  outlets: Map<string, EngineOutlet>
  vehicles: EngineVehicle[]
  travel: TravelTable
  allowances: AllowanceTable
}

export const DEFAULT_DRIVE_DATA_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../Drive Data")

function read(dir: string, file: string) {
  try {
    return parseCsv(readFileSync(path.join(dir, file), "utf8"))
  } catch (error) {
    if (error instanceof EngineDataError) throw error
    throw new EngineDataError(`Cannot read ${path.join(dir, file)}: ${(error as Error).message}`)
  }
}

/** Real reference data from the competition's Drive Data CSVs (the same files the seed imports). */
export function loadDriveData(dir = DEFAULT_DRIVE_DATA_DIR): DriveData {
  const outlets = new Map<string, EngineOutlet>()
  for (const r of read(dir, "outlets.csv")) {
    outlets.set(r.outlet_id!, {
      outletId: r.outlet_id!, brand: r.brand as Brand, district: r.district!, depot: r.depot!, dockType: r.dock_type as DockType,
      parkingConstraint: r.parking_constraint as ParkingConstraint, windowOpen: r.window_open_time!, windowClose: r.window_close_time!,
    })
  }
  const vehicles: EngineVehicle[] = read(dir, "vehicles.csv").map((r) => ({
    vehicleId: r.vehicle_id!, type: r.type as "van" | "truck", temp: r.temp as "reefer" | "ambient", depot: r.depot!,
    weightCapKg: Number(r.weight_cap_kg), volumeCapM3: Number(r.volume_cap_m3), kmPerL: Number(r.km_per_l), weeklyFuelQuotaL: Number(r.weekly_fuel_quota_l),
  }))
  return {
    outlets, vehicles,
    travel: buildTravelTable(read(dir, "district_travel.csv")),
    allowances: buildAllowanceTable(read(dir, "service_allowance.csv")),
  }
}
