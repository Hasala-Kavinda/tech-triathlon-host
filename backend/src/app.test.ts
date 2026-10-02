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

  it("uses the standard not-found envelope", async () => {
    const app = await testApp()
    const response = await app.inject({ method: "GET", url: "/missing" })
    expect(response.statusCode).toBe(404)
    expect(response.json()).toMatchObject({ success: false, error: { code: "NOT_FOUND" } })
  })
})
