import mongoose from "mongoose"
import { Order } from "./persistence/order.model.js"

export const OrderReadPort = {
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
      status: status ?? { $in: ["submitted", "deferred"] },
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
