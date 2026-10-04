import mongoose, { Schema, model } from "mongoose"


export const statusEventSchema = new Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    note: String,
  },
  { _id: false },
)

export const ruleSchema = new Schema(
  { code: String, passed: Boolean, message: String, actual: Schema.Types.Mixed, threshold: Schema.Types.Mixed },
  { _id: false },
)

export const stopSchema = new Schema(
  {
    tripStopId: { type: Schema.Types.ObjectId, required: true, default: () => new mongoose.Types.ObjectId() },
    orderIds: {
      type: [Schema.Types.ObjectId],
      ref: "Order",
      required: true,
      validate: { validator: (v: mongoose.Types.ObjectId[]) => v.length > 0, message: "A TripStop must reference at least one order" },
    },
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    outletId: { type: String, required: true },
    sequence: { type: Number, required: true },
    plannedArrivalAt: Date,
    status: { type: String, default: "planned" },
    stopId: { type: String, required: true },
  },
  { _id: false },
)

const locationPointSchema = new Schema(
  {
    type: { type: String, enum: ["Point"], default: "Point" },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
)

const lastLocationSchema = new Schema(
  {
    point: { type: locationPointSchema, required: true },
    recordedAt: { type: Date, required: true },
  },
  { _id: false },
)

export const tripSchema = new Schema(
  {
    tripNumber: { type: String, required: true },
    serviceDate: { type: String, required: true },
    departureAt: { type: Date, required: true },
    depot: { type: String, required: true },
    vehicleId: { type: String, required: true },
    driverId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    dispatcherId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    routeIndex: { type: Number, required: true, default: 1, min: 1, max: 2 },
    status: {
      type: String,
      enum: ["draft", "published", "loading", "load_confirmed", "claimed", "in_transit", "completed", "cancelled"],
      default: "draft",
    },
    stops: [stopSchema],
    distanceKm: { type: Number, required: true, min: 0 },
    totals: {
      distanceKm: { type: Number, default: 0 },
      weightKg: { type: Number, default: 0 },
      volumeM3: { type: Number, default: 0 },
      fuelLitres: { type: Number, default: 0 },
    },
    plannedEndAt: Date,
    constraintCheck: { checkedAt: Date, valid: Boolean, rules: [ruleSchema] },
    claimedByDriverId: { type: Schema.Types.ObjectId, ref: "User" },
    vehicleConfirmedAt: Date,
    startFileAssetId: String,
    endFileAssetId: String,
    startedAt: Date,
    completedAt: Date,
    acceptedAt: Date,
    acceptedBy: { type: Schema.Types.ObjectId, ref: "User" },
    lastLocation: lastLocationSchema,
    statusHistory: [statusEventSchema],
  },
  {
    timestamps: true,
    versionKey: "version",
    strict: "throw",
    optimisticConcurrency: true,
    toJSON: {
      virtuals: true,
      transform: (_doc: any, ret: any) => {
        if (ret._id) {
          ret.id = ret._id.toString()
        }
        delete ret._id
        return ret
      },
    },
  }
)

tripSchema.index({ tripNumber: 1 }, { unique: true })
// A vehicle's daily turn is held only once a trip is published. Drafts (and cancelled
// trips) must not block it, because the Dispatcher drafts a trip to validate it and may redo that.
tripSchema.index(
  { vehicleId: 1, serviceDate: 1, routeIndex: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ["published", "loading", "load_confirmed", "claimed", "in_transit", "completed"] } } },
)
tripSchema.index({ driverId: 1, serviceDate: 1 })
tripSchema.index({ status: 1, serviceDate: 1 })
tripSchema.index({ "stops.orderIds": 1 })
tripSchema.index({ "lastLocation.point": "2dsphere" })
tripSchema.index({ serviceDate: 1, vehicleId: 1, status: 1 })

export const Trip = model("Trip", tripSchema, "trips")
