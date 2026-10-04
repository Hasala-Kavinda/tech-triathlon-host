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

  /** Find remarks by status, sorted newest-first. */
  async findByStatus(status: "pending" | "reviewed", limit = 100) {
    return Remark.find({ status }).sort({ createdAt: -1 }).limit(limit).lean()
  },
}
