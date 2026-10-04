import mongoose, { Document, Schema, Types } from "mongoose"
import { createBaseSchema } from "../../../db/model-conventions.js"

export interface ITripLocation {
  pointId: string
  tripId: Types.ObjectId
  driverId: Types.ObjectId
  vehicleId: string
  location: {
    type: "Point"
    coordinates: [number, number] // [longitude, latitude]
  }
  accuracy: number
  speed?: number
  heading?: number
  recordedAt: Date
  receivedAt: Date
  source?: string
  version: number
}

export interface ITripLocationDocument extends ITripLocation, Document {
  version: number
}

const pointSchema = new Schema({
  type: {
    type: String,
    enum: ["Point"],
    required: true,
    default: "Point"
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator: function(coords: number[]) {
        if (!coords || coords.length !== 2) return false
        const lng = coords[0] as number
        const lat = coords[1] as number
        return lng >= -180 && lng <= 180 && // longitude
               lat >= -90 && lat <= 90 // latitude
      },
      message: "Coordinates must be a valid [longitude, latitude] array"
    }
  }
}, { _id: false })

const tripLocationSchema = createBaseSchema<ITripLocationDocument>({
  pointId: { type: String, required: true, unique: true },
  tripId: { type: Schema.Types.ObjectId, ref: "Trip", required: true },
  driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  vehicleId: { type: String, required: true },
  location: { type: pointSchema, required: true },
  accuracy: { type: Number, required: true },
  speed: { type: Number },
  heading: { type: Number },
  recordedAt: { type: Date, required: true },
  receivedAt: { type: Date, required: true, default: Date.now },
  source: { type: String }
})

tripLocationSchema.index({ tripId: 1, recordedAt: 1 })
tripLocationSchema.index({ driverId: 1, recordedAt: 1 })
tripLocationSchema.index({ "location": "2dsphere" })

export const TripLocation = mongoose.model<ITripLocationDocument>("TripLocation", tripLocationSchema, "trip_locations")
