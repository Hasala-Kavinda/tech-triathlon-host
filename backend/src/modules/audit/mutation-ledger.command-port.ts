import type { ClientSession } from "mongoose"
import { MutationLedger } from "./persistence/mutation-ledger.model.js"

export const MutationLedgerCommandPort = {
  async findIdempotentRecord(mutationId: string, actorId: string, operation: string, session?: ClientSession) {
    return MutationLedger.findOne({ mutationId, namespace: "api", actorId, operation }).session(session || null).lean()
  },

  async recordIdempotentResult(
    input: { mutationId: string; requestHash: string; operation: string; actorId: string; statusCode: number; response: unknown },
    session?: ClientSession
  ) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)
    await MutationLedger.create([{ ...input, namespace: "api", expiresAt }], { session })
  },

  async findSyncReceipt(mutationId: string, actorId: string, session?: ClientSession) {
    return MutationLedger.findOne({ mutationId, namespace: "sync", actorId }).session(session || null).lean()
  },

  async recordSyncReceipt(
    input: { mutationId: string; actorId: string; entityId: string; operation: string; result: string; response: unknown },
    session?: ClientSession
  ) {
    await MutationLedger.create([{ ...input, namespace: "sync" }], { session })
  },
}
