import type { ClientSession } from "mongoose"
import { Counter } from "./counter.model.js"

/**
 * CounterCommandPort — the ONLY authorised path for counter allocation.
 *
 * Rules:
 * - No other module may call Counter.findOneAndUpdate() directly.
 * - The caller owns the transaction; do NOT start a session inside here.
 * - If a session is supplied the increment participates in the caller's
 *   transaction and will roll back if that transaction is aborted.
 */
export const CounterCommandPort = {
  /**
   * Atomically allocate the next sequence value for `sequenceName`.
   *
   * Uses a single findOneAndUpdate with $inc and upsert:true so that:
   *   - The very first allocation initialises seq to 1.
   *   - Concurrent callers never receive the same value.
   *   - If `session` is provided the increment is part of the caller's
   *     transaction and will roll back on abort.
   *
   * @returns The newly allocated sequence number (1-based).
   */
  async getNextSequence(sequenceName: string, session?: ClientSession): Promise<number> {
    const doc = await Counter.findOneAndUpdate(
      { _id: sequenceName },
      { $inc: { seq: 1 } },
      {
        upsert: true,
        new: true,         // return the post-update document
        setDefaultsOnInsert: true,
        ...(session ? { session } : {}),
      },
    )
    return doc!.seq
  },
}
