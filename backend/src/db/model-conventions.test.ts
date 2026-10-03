import { describe, it, expect, beforeAll, afterAll } from "vitest"
import mongoose from "mongoose"
import { createBaseSchema, type RepositoryOptions } from "./model-conventions.js"
import { loadConfig } from "../config/env.js"

describe("model-conventions", () => {
  beforeAll(async () => {
    // connect to local mongo just for this test suite, preserving the replica set
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect("mongodb://localhost:27017/waylink_test_conventions?directConnection=true")
    }
  })

  afterAll(async () => {
    await mongoose.connection.dropDatabase()
    await mongoose.disconnect()
  })

  const TestSchema = createBaseSchema<{ name: string, version: number }>({ name: String })
  const TestModel = mongoose.model("TestConvention", TestSchema)

  it("STRICT REJECTION: rejects unknown fields", async () => {
    // Attempting to create with an unknown field should fail because strict: "throw"
    await expect(TestModel.create({ name: "test", unknownField: "bad" }))
      .rejects.toThrow(/Field `unknownField` is not in schema/)
  })

  it("VERSION INCREMENT: increments versionKey on save", async () => {
    const doc = await TestModel.create({ name: "version-test" })
    expect(doc.version).toBe(0)

    doc.name = "version-test-updated"
    await doc.save()

    expect(doc.version).toBe(1)
  })

  it("JSON TRANSFORM: canonical representation transforms _id to id", async () => {
    const doc = await TestModel.create({ name: "json-test" })
    const json = doc.toJSON() as any

    expect(json.id).toBeDefined()
    expect(typeof json.id).toBe("string")
    expect((json as any)._id).toBeUndefined()
    expect(json.version).toBe(0)
  })

  it("SESSION USE: accepts a Mongoose ClientSession via RepositoryOptions", async () => {
    // Ensure replica set is active for sessions to work
    const session = await mongoose.startSession()

    try {
      const options: RepositoryOptions = { session }
      const doc = new TestModel({ name: "session-test" })
      await doc.save(options)

      // Verify the session option is accepted by query execution
      const foundInSession = await TestModel.findOne({ name: "session-test" }).session(session)
      expect(foundInSession).toBeTruthy()
    } finally {
      await session.endSession()
    }
  })
})
