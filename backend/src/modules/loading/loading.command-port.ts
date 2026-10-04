import mongoose, { type ClientSession, Types } from "mongoose"
import { LoadRecord } from "./persistence/load-record.model.js"

export interface CreateLoadJobItem {
  itemId: string
  tripStopId: Types.ObjectId
  orderIds: Types.ObjectId[]
  sku: string
  name: string
  expectedQuantity: number
}

export interface CreateLoadJobParams {
  tripId: Types.ObjectId
  depot: string
  items: CreateLoadJobItem[]
}

export const LoadingCommandPort = {
  async createLoadJob(params: CreateLoadJobParams, session: ClientSession): Promise<void> {
    const items = params.items.map((item) => ({
      ...item,
      status: "pending",
      loadedQuantity: 0,
      varianceQuantity: -item.expectedQuantity, // Initially, loaded(0) - expected
    }))

    await LoadRecord.create([{ tripId: params.tripId, depot: params.depot, status: "available", items }], { session })
  },

  async getLoadRecordStatus(tripId: Types.ObjectId | string): Promise<string | undefined> {
    const lr = await LoadRecord.findOne({ tripId }).lean()
    return lr?.status
  },

  async applyPlanChange(
    tripId: Types.ObjectId,
    loadItems: CreateLoadJobItem[],
    planChange: { type: string; orderId: Types.ObjectId; description: string; reason: string },
    session: ClientSession,
  ): Promise<void> {
    const lr = await LoadRecord.findOne({ tripId }).session(session)
    if (!lr) throw new Error("Load record not found")
    if (lr.status !== "available" && lr.status !== "claimed") {
      throw new Error("PLAN_LOCKED")
    }

    const items = loadItems.map((item) => ({
      ...item,
      status: "pending",
      loadedQuantity: 0,
      varianceQuantity: -item.expectedQuantity,
    }))
    lr.set("items", items)

    lr.planChanges.push({
      changeId: new mongoose.Types.ObjectId().toString(),
      type: planChange.type,
      orderId: planChange.orderId,
      description: planChange.description,
      reason: planChange.reason,
      createdAt: new Date(),
    })

    await lr.save({ session })
  },
}
