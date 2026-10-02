import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest"
import { loadConfig } from "../../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../../../db/connection.js"
import { Outlet } from "./outlet.model.js"

const config = loadConfig()

describe("DB-05: Outlet Persistence", () => {
  beforeAll(async () => {
    await connectDatabase(config.mongodbUri)
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  beforeEach(async () => {
    await Outlet.deleteMany({})
    await Outlet.syncIndexes()
  })

  it("A, B, F. Required canonical fields and strict DB-02 behavior", async () => {
    // Missing fields should fail
    await expect(Outlet.create({ outletId: "OUT1" })).rejects.toThrow(/validation failed/)
    
    // Successful creation
    const doc = await Outlet.create({
      outletId: " out1 ",
      displayName: " Outlet 1 ",
      brand: " Fresh ",
      district: " Colombo ",
      depot: " DEP ",
      windowOpenTime: " 05:00 ",
      windowCloseTime: " 08:00 ",
    })
    
    // Should be trimmed and uppercase (outletId)
    expect(doc.outletId).toBe("OUT1")
    
    // Human-readable fields must preserve exact representation
    expect(doc.displayName).toBe(" Outlet 1 ")
    expect(doc.brand).toBe(" Fresh ")
    expect(doc.district).toBe(" Colombo ")
    expect(doc.depot).toBe(" DEP ")
    expect(doc.windowOpenTime).toBe(" 05:00 ")
    expect(doc.windowCloseTime).toBe(" 08:00 ")
    expect(doc.source).toBe("official_csv") // default
    expect(doc.active).toBe(true) // default
    
    // Strict schema: arbitrary field should be dropped or cause failure based on `strict: throw` in DB-02
    await expect(Outlet.create({
      outletId: "OUT2", displayName: "O", brand: "B", district: "D", depot: "DEP", windowOpenTime: "1", windowCloseTime: "2",
      arbitraryField: "value"
    })).rejects.toThrow(/Field `arbitraryField` is not in schema/)
  })

  it("C. Business-key uniqueness required", async () => {
    await Outlet.create({ outletId: "OUT3", displayName: "O", brand: "B", district: "D", depot: "DEP", windowOpenTime: "1", windowCloseTime: "2" })
    await expect(
      Outlet.create({ outletId: "out3", displayName: "O2", brand: "B2", district: "D2", depot: "DEP2", windowOpenTime: "1", windowCloseTime: "2" })
    ).rejects.toThrow(/E11000 duplicate key/)
  })

  it("E. Serialization uses DB-02 conventions (id string, no _id)", async () => {
    const doc = await Outlet.create({ outletId: "OUT4", displayName: "O", brand: "B", district: "D", depot: "DEP", windowOpenTime: "1", windowCloseTime: "2" })
    const json = doc.toJSON()
    
    expect((json as any).id).toBeDefined()
    expect((json as any)._id).toBeUndefined()
    expect((json as any).outletId).toBe("OUT4")
  })
})
