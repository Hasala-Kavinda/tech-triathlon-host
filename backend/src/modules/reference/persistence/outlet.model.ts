import mongoose, { Schema } from "mongoose"
import { createBaseSchema } from "../../../db/model-conventions.js"

export interface OutletDoc {
  outletId: string
  displayName: string
  brand: string
  district: string
  depot: string
  dockType?: string
  parkingConstraint?: string
  windowOpenTime: string
  windowCloseTime: string
  coordinates?: { latitude: number; longitude: number }
  source: string
  active: boolean
  version?: number
  createdAt?: Date
  updatedAt?: Date
}

const outletSchema = createBaseSchema<OutletDoc>(
  {
    outletId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    displayName: { type: String, required: true },
    brand: { type: String, required: true },
    district: { type: String, required: true },
    depot: { type: String, required: true },
    dockType: { type: String },
    parkingConstraint: { type: String },
    windowOpenTime: { type: String, required: true },
    windowCloseTime: { type: String, required: true },
    coordinates: { latitude: Number, longitude: Number },
    source: { type: String, default: "official_csv" },
    active: { type: Boolean, default: true },
  }
)

outletSchema.index({ depot: 1, brand: 1 })
outletSchema.index({ district: 1 })

export const Outlet = mongoose.model("Outlet", outletSchema)
