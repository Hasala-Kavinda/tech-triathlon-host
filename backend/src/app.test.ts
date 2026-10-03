import { afterEach, describe, expect, it } from "vitest"
import { createApp } from "./app/create-app.js"
import { loadConfig } from "./config/env.js"

const apps: Awaited<ReturnType<typeof createApp>>[] = []
afterEach(async () => { await Promise.all(apps.splice(0).map((app) => app.close())) })

async function testApp() {
  const app = await createApp(loadConfig({ NODE_ENV: "test", JWT_SECRET: "12345678901234567890123456789012", LOG_LEVEL: "silent" }))
  apps.push(app)
  return app
}

describe("HTTP foundation", () => {
  it("returns a correlated liveness response", async () => {
    const app = await testApp()
    const response = await app.inject({ method: "GET", url: "/health/live", headers: { "x-request-id": "test-request" } })
    expect(response.statusCode).toBe(200)
    expect(response.headers["x-request-id"]).toBe("test-request")
    expect(response.json()).toMatchObject({ success: true, requestId: "test-request", data: { status: "alive" } })
  })

  it("generates a request ID if none is provided", async () => {
    const app = await testApp()
    const response = await app.inject({ method: "GET", url: "/health/live" })
    expect(response.statusCode).toBe(200)
    const reqId = response.headers["x-request-id"]
    expect(typeof reqId).toBe("string")
    expect((reqId as string).length).toBeGreaterThan(0)
    expect(response.json().requestId).toBe(reqId)
  })

  it("uses the standard not-found envelope", async () => {
    const app = await testApp()
    const response = await app.inject({ method: "GET", url: "/missing" })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ success: false, error: { code: "NOT_FOUND" } })
  })

  it("safely formats known AppErrors", async () => {
    const app = await testApp()
    app.get("/test-error", async () => {
      const { AppError } = await import("./common/errors.js")
      throw new AppError(403, "FORBIDDEN", "Not allowed", { reason: "test" })
    })
    const response = await app.inject({ method: "GET", url: "/test-error" })
    expect(response.statusCode).toBe(403)
    expect(response.json()).toMatchObject({ success: false, error: { code: "FORBIDDEN", message: "Not allowed", details: { reason: "test" } } })
  })

  it("safely formats Zod validation errors", async () => {
    const app = await testApp()
    app.get("/test-zod", async () => {
      const { z } = await import("zod")
      z.string().parse(123) // Throws ZodError
    })
    const response = await app.inject({ method: "GET", url: "/test-zod" })
    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({ success: false, error: { code: "VALIDATION_ERROR" } })
    expect(response.json().error.details).toBeDefined()
  })

  it("hides stack traces and sensitive details for unexpected errors", async () => {
    const app = await testApp()
    app.get("/test-unexpected", async () => {
      throw new Error("Secret database connection failed: mongodb://root:password@localhost")
    })
    const response = await app.inject({ method: "GET", url: "/test-unexpected" })
    expect(response.statusCode).toBe(500)
    const json = response.json()
    expect(json).toMatchObject({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." } })
    expect(JSON.stringify(json)).not.toContain("mongodb://")
    expect(JSON.stringify(json)).not.toContain("password")
    expect(json.error.stack).toBeUndefined()
  })
})
