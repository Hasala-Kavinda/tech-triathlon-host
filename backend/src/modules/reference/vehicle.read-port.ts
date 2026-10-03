import { Vehicle } from "./persistence/vehicle.model.js"

export const VehicleReadPort = {
  findByVehicleId: async (vehicleId: string) => {
    return Vehicle.findOne({ vehicleId, active: true }).lean()
  },
  
  findActiveByFilter: async (filter: { depot?: string | undefined, type?: string | undefined, temp?: string | undefined }) => {
    const query: Record<string, unknown> = { active: true }
    if (filter.depot) query.depot = filter.depot
    if (filter.type) query.type = filter.type
    if (filter.temp) query.temperatureClass = filter.temp
    return Vehicle.find(query).sort({ vehicleId: 1 }).lean()
  }
}
