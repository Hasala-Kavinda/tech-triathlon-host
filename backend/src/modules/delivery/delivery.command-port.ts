import { clock } from "../../common/clock.js"
import mongoose from "mongoose"
import { DeliveryRecord } from "./persistence/delivery-record.model.js"
import { PIN_MAX_ATTEMPTS, PinChallenge } from "./persistence/pin-challenge.model.js"
import { hmacSha256 } from "../../common/crypto.js"
import { loadConfig } from "../../config/env.js"

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

  async recreateDeliveryRecordsForPublishedTrip(tripId: mongoose.Types.ObjectId, records: CreateDeliveryInput[], session: mongoose.ClientSession) {
    await DeliveryRecord.deleteMany({ tripId }).session(session)
    await this.createDeliveryRecordsForPublishedTrip(records, session)
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
  },

  async issueChallenge(deliveryRecordId: mongoose.Types.ObjectId, pin: string, expiresAt: Date) {
    await PinChallenge.updateMany(
      { deliveryRecordId, status: "issued" },
      { $set: { status: "revoked", revokedAt: new Date() } }
    )
    
    const config = loadConfig()
    const pinHash = hmacSha256(pin, config.pinHmacSecret)
    return await PinChallenge.create({
      deliveryRecordId,
      pinHash,
      expiresAt,
      attempts: 0,
      maxAttempts: PIN_MAX_ATTEMPTS,
      status: "issued"
    })
  },

  async verifyChallenge(deliveryRecordId: mongoose.Types.ObjectId, pin: string, clientRecordedAt: Date) {
    const challenge = await PinChallenge.findOne({ 
      deliveryRecordId, 
      status: { $in: ["issued", "locked", "expired"] } 
    }).sort({ createdAt: -1 }).select("+pinHash")
    
    if (!challenge) {
      return { verified: false, error: "PIN_NOT_FOUND", attemptsLeft: 0 }
    }
    
    if (challenge.status === "locked") {
      return { verified: false, error: "PIN_ATTEMPTS_EXCEEDED", attemptsLeft: 0 }
    }
    
    if (challenge.status === "expired" || challenge.expiresAt <= clock.now()) {
      if (challenge.status !== "expired") {
        challenge.status = "expired"
        await challenge.save()
      }
      return { verified: false, error: "PIN_EXPIRED", attemptsLeft: 0 }
    }
    
    if (challenge.attempts >= challenge.maxAttempts) {
      challenge.status = "locked"
      await challenge.save()
      return { verified: false, error: "PIN_ATTEMPTS_EXCEEDED", attemptsLeft: 0 }
    }
    
    const config = loadConfig()
    const expectedHash = hmacSha256(pin, config.pinHmacSecret)
    const isValid = challenge.pinHash === expectedHash
    
    challenge.attempts += 1
    
    if (isValid) {
      challenge.status = "verified"
      challenge.verifiedAt = clientRecordedAt
      await challenge.save()
      return { verified: true, attemptsLeft: Math.max(0, challenge.maxAttempts - challenge.attempts) }
    } else {
      if (challenge.attempts >= challenge.maxAttempts) {
        challenge.status = "locked"
      }
      await challenge.save()
      return { verified: false, error: "PIN_INCORRECT", attemptsLeft: Math.max(0, challenge.maxAttempts - challenge.attempts) }
    }
  }
}
