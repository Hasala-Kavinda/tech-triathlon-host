import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import mongoose from "mongoose"
import { connectDatabase } from "../../db/connection.js"
import { loadConfig } from "../../config/env.js"
import { DeliveryCommandPort } from "./delivery.command-port.js"
import { PinChallenge } from "./persistence/pin-challenge.model.js"

describe("DeliveryCommandPort PIN Challenges", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  afterAll(async () => {
    await mongoose.disconnect()
  })

  beforeEach(async () => {
    await PinChallenge.deleteMany({})
  })

  it("issues a challenge and revokes existing active challenges", async () => {
    const deliveryId = new mongoose.Types.ObjectId()
    
    // First challenge
    const challenge1 = await DeliveryCommandPort.issueChallenge(deliveryId, "1234", new Date(Date.now() + 10000))
    expect(challenge1.status).toBe("issued")
    
    // Second challenge
    const challenge2 = await DeliveryCommandPort.issueChallenge(deliveryId, "5678", new Date(Date.now() + 10000))
    expect(challenge2.status).toBe("issued")
    
    const reloaded1 = await PinChallenge.findById(challenge1._id)
    expect(reloaded1!.status).toBe("revoked")
    expect(reloaded1!.revokedAt).toBeDefined()
  })

  it("verifies correct PIN", async () => {
    const deliveryId = new mongoose.Types.ObjectId()
    await DeliveryCommandPort.issueChallenge(deliveryId, "1234", new Date(Date.now() + 10000))
    
    const clientRecordedAt = new Date()
    const result = await DeliveryCommandPort.verifyChallenge(deliveryId, "1234", clientRecordedAt)
    
    expect(result.verified).toBe(true)
    
    const challenge = await PinChallenge.findOne({ deliveryRecordId: deliveryId })
    expect(challenge!.status).toBe("verified")
    expect(challenge!.verifiedAt).toEqual(clientRecordedAt)
  })

  it("rejects incorrect PIN and increments attempts", async () => {
    const deliveryId = new mongoose.Types.ObjectId()
    await DeliveryCommandPort.issueChallenge(deliveryId, "1234", new Date(Date.now() + 10000))
    
    const result = await DeliveryCommandPort.verifyChallenge(deliveryId, "9999", new Date())
    
    expect(result.verified).toBe(false)
    expect(result.error).toBe("PIN_INCORRECT")
    expect(result.attemptsLeft).toBe(2) // 3 - 1 (spec: at most three attempts)
    
    const challenge = await PinChallenge.findOne({ deliveryRecordId: deliveryId })
    expect(challenge!.status).toBe("issued")
    expect(challenge!.attempts).toBe(1)
  })

  it("locks after maximum attempts", async () => {
    const deliveryId = new mongoose.Types.ObjectId()
    await DeliveryCommandPort.issueChallenge(deliveryId, "1234", new Date(Date.now() + 10000))
    
    for (let i = 0; i < 2; i++) {
      await DeliveryCommandPort.verifyChallenge(deliveryId, "9999", new Date())
    }
    
    const result3 = await DeliveryCommandPort.verifyChallenge(deliveryId, "9999", new Date())
    expect(result3.verified).toBe(false)
    expect(result3.error).toBe("PIN_INCORRECT")
    expect(result3.attemptsLeft).toBe(0)
    
    // Now it should be locked
    const result4 = await DeliveryCommandPort.verifyChallenge(deliveryId, "9999", new Date())
    expect(result4.verified).toBe(false)
    expect(result4.error).toBe("PIN_ATTEMPTS_EXCEEDED")
    
    const challenge = await PinChallenge.findOne({ deliveryRecordId: deliveryId })
    expect(challenge!.status).toBe("locked")
    expect(challenge!.attempts).toBe(3)
  })

  it("rejects expired challenge", async () => {
    const deliveryId = new mongoose.Types.ObjectId()
    await DeliveryCommandPort.issueChallenge(deliveryId, "1234", new Date(Date.now() - 1000)) // Already expired
    
    const result = await DeliveryCommandPort.verifyChallenge(deliveryId, "1234", new Date())
    
    expect(result.verified).toBe(false)
    expect(result.error).toBe("PIN_EXPIRED")
    
    const challenge = await PinChallenge.findOne({ deliveryRecordId: deliveryId })
    expect(challenge!.status).toBe("expired")
  })
  
  it("rejects verification if challenge is revoked or verified", async () => {
    const deliveryId = new mongoose.Types.ObjectId()
    
    await DeliveryCommandPort.issueChallenge(deliveryId, "1234", new Date(Date.now() + 10000))
    
    const challenge = await PinChallenge.findOne({ deliveryRecordId: deliveryId, status: "issued" })
    challenge!.status = "verified"
    await challenge!.save()
    
    const result = await DeliveryCommandPort.verifyChallenge(deliveryId, "1234", new Date())
    expect(result.verified).toBe(false)
    expect(result.error).toBe("PIN_NOT_FOUND")
  })
})
