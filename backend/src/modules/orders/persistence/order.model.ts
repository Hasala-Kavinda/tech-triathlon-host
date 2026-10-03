import mongoose from "mongoose"
import { createBaseSchema } from "../../../db/model-conventions.js"

// Subdocument: status audit event
const statusEventSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    at: { type: Date, required: true, default: Date.now },
    actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    note: String,
  },
  { _id: false },
)

// Subdocument: immutable product snapshot per order line
const orderItemSchema = new mongoose.Schema(
  {
    productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    sku: { type: String, required: true },
    name: { type: String, required: true },
    unit: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitWeightKg: { type: Number, required: true, min: 0 },
    unitVolumeM3: { type: Number, required: true, min: 0 },
    temperatureClass: { type: String, required: true },
    fragile: { type: Boolean, required: true },
  },
  { _id: false },
)

export interface OrderItemDoc {
  productId: mongoose.Types.ObjectId
  sku: string
  name: string
  unit: string
  quantity: number
  unitWeightKg: number
  unitVolumeM3: number
  temperatureClass: string
  fragile: boolean
}

export interface StatusEventDoc {
  status: string
  at: Date
  actorId?: mongoose.Types.ObjectId
  note?: string
}

export const ORDER_STATUSES = ["submitted", "deferred", "allocated", "loading", "load_confirmed", "in_transit", "delivered", "delivery_failed", "cancelled"] as const
export type OrderStatus = typeof ORDER_STATUSES[number]

export const CUTOFF_BUCKETS = ["before_cutoff", "after_cutoff"] as const
export type CutoffBucket = typeof CUTOFF_BUCKETS[number]

export interface OrderDoc {
  // Identity
  orderNumber: string

  // Ownership (DB-05: string outletId canonical)
  outletId: string
  storeManagerId: mongoose.Types.ObjectId  // User ObjectId reference

  // Order context
  brand: string
  orderType: string
  requestedDate: string   // YYYY-MM-DD canonical string (no JS Date coercion)
  cutoffBucket: CutoffBucket

  // Items: full product snapshot at order time
  items: OrderItemDoc[]

  // Totals derived at order creation
  totalWeightKg: number
  totalVolumeM3: number

  // State machine
  status: OrderStatus

  // Deferral (D4 — preserved as-is)
  deferredTo?: string
  deferralReason?: string

  // Allocation (Planning phase)
  allocatedTripId?: mongoose.Types.ObjectId

  // Rich audit history
  statusHistory: StatusEventDoc[]

  // Timestamps (via createBaseSchema)
  createdAt?: Date
  updatedAt?: Date
  version?: number
}

const orderSchema = createBaseSchema<OrderDoc>({
  // Identity
  orderNumber: { type: String, required: true, unique: true },

  // Ownership
  outletId: { type: String, required: true },
  storeManagerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

  // Order context
  brand: { type: String, required: true },
  orderType: { type: String, required: true },
  requestedDate: { type: String, required: true },
  cutoffBucket: { type: String, enum: CUTOFF_BUCKETS, required: true },

  // Item snapshots
  items: { type: [orderItemSchema], required: true },

  // Totals
  totalWeightKg: { type: Number, required: true },
  totalVolumeM3: { type: Number, required: true },

  // Status
  status: { type: String, enum: ORDER_STATUSES, default: "submitted" },

  // Deferral (D4 semantics preserved)
  deferredTo: String,
  deferralReason: String,

  // Allocation
  allocatedTripId: { type: mongoose.Schema.Types.ObjectId, ref: "Trip" },

  // Audit history
  statusHistory: { type: [statusEventSchema], default: [] },
})

// Required access pattern indexes
orderSchema.index({ outletId: 1, createdAt: -1 })
orderSchema.index({ requestedDate: 1, status: 1, brand: 1 })
orderSchema.index({ allocatedTripId: 1 }, { sparse: true })
orderSchema.index({ cutoffBucket: 1, status: 1 })

export const Order = mongoose.model("Order", orderSchema)
