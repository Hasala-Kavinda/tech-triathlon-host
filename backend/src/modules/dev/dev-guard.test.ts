import { describe, expect, it } from "vitest"
import { createApp } from "../../app/create-app.js"
import { loadConfig } from "../../config/env.js"

const base = {
  JWT_SECRET: "12345678901234567890123456789012", PIN_HMAC_SECRET: "12345678901234567890123456789012",
  LOGIN_ORIGIN: "http://login.test", DISPATCHER_ORIGIN: "http://dispatcher.test", LOADER_ORIGIN: "http://loader.test", DRIVER_ORIGIN: "http://driver.test", STORE_MANAGER_ORIGIN: "http://store.test",
}
const post = (app: Awaited<ReturnType<typeof createApp>>, headers: Record<string, string> = {}) =>
  app.inject({ method: "POST", url: "/api/v1/dev/seed-scenario", payload: { stage: "submitted" }, headers })

describe("dev scenario endpoint guard", () => {
  it("does not exist when NODE_ENV=production (404, not 401/403)", async () => {
    const app = await createApp(loadConfig({ ...base, NODE_ENV: "production", DEV_MODE: "false", JWT_SECRET: "a-real-production-secret-0123456789ab", PIN_HMAC_SECRET: "another-real-production-secret-0123456" }))
    expect((await post(app)).statusCode).toBe(404)
    expect((await post(app, { authorization: "Bearer anything" })).statusCode).toBe(404)
    await app.close()
  })

  it("does not exist when NODE_ENV=test", async () => {
    const app = await createApp(loadConfig({ ...base, NODE_ENV: "test" }))
    expect((await post(app)).statusCode).toBe(404)
    await app.close()
  })

  it("exists in development, but only for an authenticated Dispatcher (401 without a token)", async () => {
    const app = await createApp(loadConfig({ ...base, NODE_ENV: "development" }))
    expect((await post(app)).statusCode).toBe(401)
    await app.close()
  })
})
