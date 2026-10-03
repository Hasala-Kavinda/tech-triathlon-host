import mongoose from "mongoose"
import { Order } from "./persistence/order.model.js"
import { conflict } from "../../common/errors.js"

/**
 * Order application commands — the only authorised path for cross-module writes
 * to the Order aggregate.
 *
 * Rules:
 * - Only this file may call mutating Mongoose methods on Order.
 * - Planning, Driver, and Operations must use these commands.
 * - Do NOT export the Order model from this file.
 */

export interface AllocateOrdersResult {
  modifiedCount: number
}

/**
 * Atomically allocate a batch of orders to a trip (Planning — publish step).
 * Must be called within an existing Mongoose session/transaction.
 */
export async function allocateOrdersToTrip(
  orderIds: (string | mongoose.Types.ObjectId)[],
  tripId: mongoose.Types.ObjectId,
  actorId: string,
  session: mongoose.ClientSession,
): Promise<AllocateOrdersResult> {
  const update = await Order.updateMany(
    { _id: { $in: orderIds }, status: { $in: ["submitted", "deferred"] }, allocatedTripId: { $exists: false } },
    {
      $set: { status: "allocated", allocatedTripId: tripId },
      $push: { statusHistory: { status: "allocated", at: new Date(), actorId } },
    },
    { session },
  )
  return { modifiedCount: update.modifiedCount }
}

/**
 * Defer a single order to a future date (Planning dispatcher).
 * Returns the updated order as a plain object, or null if not deferrable.
 */
export async function deferOrder(
  orderId: string,
  nextDate: string,
  reasonCode: string,
  note: string | undefined,
  actorId: string,
) {
  const order = await Order.findOneAndUpdate(
    { _id: orderId, status: { $in: ["submitted", "deferred"] }, allocatedTripId: { $exists: false } },
    {
      $set: { status: "deferred", deferredTo: nextDate, deferralReason: reasonCode },
      $push: { statusHistory: { status: "deferred", at: new Date(), actorId, note: note ?? reasonCode } },
    },
    { new: true },
  )
  return order ? order.toObject() : null
}

/**
 * Defer a batch of orders to a future date (Planning dispatcher).
 * Returns per-order results.
 */
export async function deferOrderBatch(
  orderIds: string[],
  nextDate: string,
  reasonCode: string,
  note: string | undefined,
  actorId: string,
) {
  const results = []
  for (const orderId of orderIds) {
    const order = await Order.findOneAndUpdate(
      { _id: orderId, status: { $in: ["submitted", "deferred"] }, allocatedTripId: { $exists: false } },
      {
        $set: { status: "deferred", deferredTo: nextDate, deferralReason: reasonCode },
        $push: { statusHistory: { status: "deferred", at: new Date(), actorId, note: note ?? reasonCode } },
      },
      { new: true },
    ).lean()
    results.push({ orderId, result: order ? "deferred" : "conflict", order })
  }
  return results
}

/**
 * Mark an order as delivered.
 *
 * DB-10 MIGRATION POINT: This command will be superseded by the Delivery
 * persistence boundary in DB-10. For now it lives here to keep the Driver
 * module from directly accessing the Order Mongoose model.
 *
 * The delivery status write must still be transactionally safe; the caller
 * is responsible for ensuring the DeliveryRecord is persisted before calling
 * this command.
 */
export async function markOrderDelivered(
  orderId: mongoose.Types.ObjectId | string,
  completedAt: Date,
  actorId: string,
) {
  await Order.findByIdAndUpdate(
    orderId,
    {
      $set: { status: "delivered" },
      $push: { statusHistory: { status: "delivered", at: completedAt, actorId } },
    },
  )
}
