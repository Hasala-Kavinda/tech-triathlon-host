import mongoose from "mongoose"
import { DeliveryRecord } from "./persistence/delivery-record.model.js"

export interface CreateDeliveryItemInput {
  sku: string
  orderIds: mongoose.Types.ObjectId[]
  expectedQuantity: number
}

export interface CreateDeliveryInput {
  tripId: mongoose.Types.ObjectId
  tripStopId: mongoose.Types.ObjectId
  outletId: string
  driverId: mongoose.Types.ObjectId
  items: CreateDeliveryItemInput[]
}

export interface UpdateExpectedQuantityInput {
  tripStopId: mongoose.Types.ObjectId
  sku: string
  loadedQuantity: number
}

export const DeliveryCommandPort = {
  async createDeliveryRecordsForPublishedTrip(records: CreateDeliveryInput[], session?: mongoose.ClientSession | null) {
    const docs = records.map(r => ({
      tripId: r.tripId,
      tripStopId: r.tripStopId,
      outletId: r.outletId,
      driverId: r.driverId,
      status: "pending",
      items: r.items.map(item => ({
        sku: item.sku,
        orderIds: item.orderIds,
        expected: item.expectedQuantity,
      })),
      proof: { status: "none" }
    }))
    
    if (session) await DeliveryRecord.insertMany(docs, { session })
    else await DeliveryRecord.insertMany(docs)
  },

  async updateExpectedQuantitiesForLoadConfirmation(tripId: mongoose.Types.ObjectId, loadItems: UpdateExpectedQuantityInput[], session?: mongoose.ClientSession | null) {
    const records = await DeliveryRecord.find({ tripId }).session(session || null)
    
    for (const record of records) {
      let changed = false
      for (const item of record.items) {
        const matchingLoadItem = loadItems.find(
          li => String(li.tripStopId) === String(record.tripStopId) && li.sku === item.sku
        )
        if (matchingLoadItem) {
          item.expected = matchingLoadItem.loadedQuantity
          changed = true
        }
      }
      if (changed) {
        if (session) await record.save({ session })
        else await record.save()
      }
    }
  }
}
