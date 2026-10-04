import { Remark } from "./persistence/remark.model.js"

/**
 * RemarkReadPort — the ONLY authorised path for reading from the remarks
 * collection.
 *
 * No other module may call Remark.find/findOne directly.
 */

export const RemarkReadPort = {
  /** Find a single remark by its MongoDB _id. */
  async findById(id: string) {
    return Remark.findById(id).lean()
  },

  /** Find all remarks for a given entity (e.g. all remarks about a specific trip). */
  async findByEntity(entityType: string, entityId: string) {
    return Remark.find({ entityType, entityId }).sort({ createdAt: -1 }).lean()
  },

  /** All remarks for a trip, newest first. */
  async findByTrip(tripId: string) {
    return Remark.find({ tripId }).sort({ createdAt: -1 }).lean()
  },

  /** Count of remarks still awaiting dispatcher review on a trip. */
  async countPendingByTrip(tripId: string) {
    return Remark.countDocuments({ tripId, status: "pending" })
  },

  /** Notices addressed to a user (reviewed remarks with a notice), newest first. */
  async findNoticesFor(userId: string, limit = 50) {
    return Remark.find({ "notice.recipientIds": userId }).sort({ reviewedAt: -1 }).limit(limit).lean()
  },

  /** Find remarks by status, sorted newest-first. */
  async findByStatus(status: "pending" | "reviewed", limit = 100) {
    return Remark.find({ status }).sort({ createdAt: -1 }).limit(limit).lean()
  },
}
