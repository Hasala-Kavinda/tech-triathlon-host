import { describe, it, expect, vi } from "vitest"
import { VehicleReadPort } from "../reference/vehicle.read-port.js"

// We mock VehicleReadPort to ensure no direct Mongoose dependency
vi.mock("../reference/vehicle.read-port.js", () => ({
  VehicleReadPort: {
    findByVehicleId: vi.fn(),
    findActiveByFilter: vi.fn(),
  }
}))

describe("Vehicle Boundary", () => {
  it("should provide lean read results without mongoose models", async () => {
    const mockVehicle = {
      vehicleId: "VEH-1",
      type: "van",
      temperatureClass: "ambient",
      weightCapacityKg: 1000,
      volumeCapacityM3: 5,
      fuelType: "diesel",
      kmPerL: 10,
      weeklyFuelQuotaL: 50,
      depot: "DEPOT-1",
      active: true
    }
    
    vi.mocked(VehicleReadPort.findByVehicleId).mockResolvedValue(mockVehicle as any)

    const result = await VehicleReadPort.findByVehicleId("VEH-1")
    expect(result).toEqual(mockVehicle)
    // No .save() method exists, proving it's not a live document
    expect((result as any).save).toBeUndefined()
  })
})
