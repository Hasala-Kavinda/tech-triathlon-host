import mongoose from "mongoose"
import { Order } from "./persistence/order.model.js"

/** Orders a dispatcher can still schedule: not yet allocated to a trip. */
const UNSCHEDULED_STATUSES = ["submitted", "deferred"]

export const OrderReadPort = {
  /**
   * Every non-cancelled order due on a date (scheduled or not), for the due-calendar detail panel.
   */
  findDueByDate: async (requestedDate: string, brand?: string) => {
    const filter: Record<string, unknown> = { requestedDate, status: { $ne: "cancelled" } }
    if (brand) filter.brand = brand
    return Order.find(filter).sort({ cutoffBucket: 1, createdAt: 1 }).limit(200).lean()
  },

  /**
   * Per-date, per-brand due counts over [from, to] (requestedDate is the "due" date).
   * `due` excludes cancelled orders; `unscheduled` uses the same predicate as findEligibleForDatePaged.
   * Used by: Planning dispatcher due-calendar widget.
   */
  dueSummary: async (from: string, to: string) => {
    return Order.aggregate<{ date: string; brand: string; due: number; unscheduled: number }>([
      { $match: { requestedDate: { $gte: from, $lte: to }, status: { $ne: "cancelled" } } },
      {
        $group: {
          _id: { date: "$requestedDate", brand: "$brand" },
          due: { $sum: 1 },
          unscheduled: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $in: ["$status", UNSCHEDULED_STATUSES] },
                    { $eq: [{ $type: "$allocatedTripId" }, "missing"] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $project: { _id: 0, date: "$_id.date", brand: "$_id.brand", due: 1, unscheduled: 1 } },
      { $sort: { date: 1, brand: 1 } },
    ])
  },

  /**
   * Find a single order by its MongoDB _id.
   * Used by: Planning, Driver, Operations for cross-module reads.
   */
  findById: async (orderId: string) => {
    return Order.findById(orderId).lean()
  },

  /**
   * Find multiple orders by their MongoDB _id array.
   * Used by: Planning (constraint validation), Driver (manifest), Trip hydration.
   */
  findByIds: async (orderIds: (string | mongoose.Types.ObjectId)[]) => {
    return Order.find({ _id: { $in: orderIds } }).lean()
  },

  /**
   * Session-aware findByIds — used inside Mongoose transactions.
   * Used by: Planning publish (load-record construction after allocation).
   */
  findByIdsInSession: async (orderIds: (string | mongoose.Types.ObjectId)[], session: mongoose.ClientSession) => {
    return Order.find({ _id: { $in: orderIds } }).session(session).lean()
  },

  /**
   * Find orders eligible for planning on a given service date, with pagination.
   * Used by: Planning dispatcher order view.
   */
  findEligibleForDatePaged: async (
    requestedDate: string,
    brand: string | undefined,
    status: string | undefined,
    skip: number,
    limit: number,
  ) => {
    const filter: Record<string, unknown> = {
      requestedDate,
      status: status ?? { $in: UNSCHEDULED_STATUSES },
      allocatedTripId: { $exists: false },
    }
    if (brand) filter.brand = brand
    const [rows, total] = await Promise.all([
      Order.find(filter).sort({ cutoffBucket: 1, createdAt: 1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(filter),
    ])
    return { rows, total }
  },

  /**
   * Find orders by MongoDB _id array with pagination and count.
   * Used by: Driver order history (trip stop IDs).
   */
  findByIdsPaged: async (orderIds: (string | mongoose.Types.ObjectId)[], skip: number, limit: number) => {
    const [rows, total] = await Promise.all([
      Order.find({ _id: { $in: orderIds } }).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments({ _id: { $in: orderIds } }),
    ])
    return { rows, total }
  },

  /**
   * Find orders for an outlet, used by Store manager history views.
   */
  findByOutlet: async (outletId: string, filter?: { status?: string; from?: string; to?: string }, pagination?: { skip: number; limit: number }) => {
    const query: Record<string, unknown> = { outletId }
    if (filter?.status) query.status = filter.status
    if (filter?.from || filter?.to) {
      query.requestedDate = {
        ...(filter.from ? { $gte: filter.from } : {}),
        ...(filter.to ? { $lte: filter.to } : {}),
      }
    }
    const { skip = 0, limit = 20 } = pagination ?? {}
    const [rows, total] = await Promise.all([
      Order.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Order.countDocuments(query),
    ])
    return { rows, total }
  },

  /**
   * Find recent orders for an outlet (limited count).
   * Used by: Operations dashboard.
   */
  findRecentByOutlet: async (outletId: string, limit: number) => {
    return Order.find({ outletId }).sort({ createdAt: -1 }).limit(limit).lean()
  },
}
