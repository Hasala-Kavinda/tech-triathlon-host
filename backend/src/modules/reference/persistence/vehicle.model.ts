import mongoose from "mongoose"
import { createBaseSchema } from "../../../db/model-conventions.js"

export interface VehicleDoc {
  vehicleId: string
  type: string
  temperatureClass: string
  weightCapacityKg: number
  volumeCapacityM3: number
  fuelType: string
  kmPerL: number
  weeklyFuelQuotaL: number
  depot: string
  active: boolean
  version?: number
  createdAt?: Date
  updatedAt?: Date
}

const vehicleSchema = createBaseSchema<VehicleDoc>({
  vehicleId: { type: String, required: true, unique: true },
  type: { type: String, required: true },
  temperatureClass: { type: String, required: true },
  weightCapacityKg: { type: Number, required: true, min: 0 },
  volumeCapacityM3: { type: Number, required: true, min: 0 },
  fuelType: { type: String, required: true },
  kmPerL: { type: Number, required: true, min: 0.01 },
  weeklyFuelQuotaL: { type: Number, required: true, min: 0 },
  depot: { type: String, required: true },
  active: { type: Boolean, default: true },
})

vehicleSchema.index({ depot: 1, type: 1, temperatureClass: 1, active: 1 })

export const Vehicle = mongoose.model("Vehicle", vehicleSchema)
