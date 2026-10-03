import mongoose, { Schema, Document, Types } from "mongoose"

export interface IEventScope {
  outletIds?: string[]
  depot?: string
  tripId?: string
  driverId?: string
  loaderId?: string
}

export interface IOperationalEvent {
  eventType: string
  entityType: string
  entityId: string
  actorId?: Types.ObjectId
  actorRole?: string
  requestId?: string
  scope?: IEventScope
  data?: any
  createdAt: Date
  updatedAt: Date
}

export interface IOperationalEventDocument extends IOperationalEvent, Document {}

const scopeSchema = new Schema(
  {
    outletIds: { type: [String], default: undefined },
    depot: String,
    tripId: String,
    driverId: String,
    loaderId: String,
  },
  { _id: false },
)

const eventSchema = new Schema(
  {
    eventType: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorRole: String,
    requestId: String,
    scope: scopeSchema,
    data: Schema.Types.Mixed,
  },
  { timestamps: true, versionKey: false },
)

eventSchema.index({ entityType: 1, entityId: 1, createdAt: -1 })
eventSchema.index({ "scope.outletIds": 1, createdAt: -1 })

export const OperationalEvent = mongoose.model<IOperationalEventDocument>("OperationalEvent", eventSchema)
