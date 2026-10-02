import mongoose from "mongoose"
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { connectDatabase, disconnectDatabase } from "../../../db/connection.js"
import { loadConfig } from "../../../config/env.js"
import { LoadRecord } from "./load-record.model.js"

describe("LoadRecord Model (DB-12)", () => {
  beforeAll(async () => {
    const config = loadConfig()
    await connectDatabase(config.mongodbUri)
  })

  beforeEach(async () => {
    await LoadRecord.deleteMany({})
  })

  afterAll(async () => {
    await LoadRecord.deleteMany({})
    await disconnectDatabase()
  })

  it("should enforce tripId uniqueness", async () => {
    const tripId = new mongoose.Types.ObjectId()
    await LoadRecord.create({ tripId, depot: "D1", items: [] })
    await expect(LoadRecord.create({ tripId, depot: "D2", items: [] })).rejects.toThrow(/E11000 duplicate key error/)
  })

  it("should compute varianceQuantity automatically on save", async () => {
    const record = await LoadRecord.create({
      tripId: new mongoose.Types.ObjectId(),
      depot: "D1",
      items: [
        {
          itemId: "IT1",
          tripStopId: new mongoose.Types.ObjectId(),
          orderIds: [new mongoose.Types.ObjectId()],
          sku: "S1",
          name: "Item 1",
          expectedQuantity: 10,
        }
      ]
    })
    
    // Initially loaded is 0, so variance is -10
    expect(record.items[0]!.varianceQuantity).toBe(-10)

    record.items[0]!.loadedQuantity = 12
    await record.save()
    
    // Now loaded is 12, so variance is 2
    expect(record.items[0]!.varianceQuantity).toBe(2)
  })

  it("should validate strict exception schema", async () => {
    const record = new LoadRecord({
      tripId: new mongoose.Types.ObjectId(),
      depot: "D1",
      items: [
        {
          itemId: "IT1",
          tripStopId: new mongoose.Types.ObjectId(),
          orderIds: [new mongoose.Types.ObjectId()],
          sku: "S1",
          name: "Item 1",
          expectedQuantity: 10,
        }
      ]
    })
    
    // Valid exception
    record.items[0]!.exception = { type: "missing", quantity: 2, reasonCode: "RC1", note: "some note" }
    let err = record.validateSync()
    expect(err).toBeUndefined()

    // Invalid type
    record.items[0]!.exception = { type: "invalid" as any, quantity: 2, reasonCode: "RC1" }
    err = record.validateSync()
    expect(err).toBeDefined()
    expect(err!.errors["items.0.exception.type"]!.message).toMatch(/is not a valid enum value/)

    // Missing required reasonCode
    record.items[0]!.exception = { type: "damaged", quantity: 2 } as any
    err = record.validateSync()
    expect(err).toBeDefined()
    expect(err!.errors["items.0.exception.reasonCode"]!.message).toMatch(/Path `reasonCode` is required/)
  })
})
