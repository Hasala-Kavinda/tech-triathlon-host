import type { ClientSession, Types } from "mongoose"
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
}
