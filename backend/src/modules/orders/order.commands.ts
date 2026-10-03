import mongoose from "mongoose"
import { Order, type OrderStatus } from "./persistence/order.model.js"
import { isUndeliveredOutcome, type StopOutcome } from "../delivery/timing.js"
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
 * Move every order allocated to a trip from one status to the next
 * (loading, load confirmation, trip start). Only orders currently in `from`
 * are touched, so a repeated call changes nothing.
 * Must be called within the caller's transaction.
 */
export async function advanceOrdersForTrip(
  tripId: mongoose.Types.ObjectId | string,
  from: OrderStatus,
  to: OrderStatus,
  actorId: string,
  session: mongoose.ClientSession,
): Promise<{ modifiedCount: number }> {
  const update = await Order.updateMany(
    { allocatedTripId: tripId, status: from },
    {
      $set: { status: to },
      $push: { statusHistory: { status: to, at: new Date(), actorId } },
    },
    { session },
  )
  return { modifiedCount: update.modifiedCount }
}

/**
 * Record the delivery outcome on every order served by a stop.
 * `failed` outcomes become `delivery_failed`; `delivered` and `partial`
 * become `delivered`. Must be called within the caller's transaction so the
 * delivery record and the orders cannot disagree.
 */
export async function markOrdersDelivered(
  orderIds: (mongoose.Types.ObjectId | string)[],
  outcome: StopOutcome,
  completedAt: Date,
  actorId: string,
  session: mongoose.ClientSession,
): Promise<{ modifiedCount: number }> {
  const status: OrderStatus = isUndeliveredOutcome(outcome) ? "delivery_failed" : "delivered"
  const update = await Order.updateMany(
    { _id: { $in: orderIds }, status: { $in: ["allocated", "loading", "load_confirmed", "in_transit"] } },
    {
      $set: { status },
      $push: { statusHistory: { status, at: completedAt, actorId } },
    },
    { session },
  )
  return { modifiedCount: update.modifiedCount }
}
