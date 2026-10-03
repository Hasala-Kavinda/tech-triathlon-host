import { describe, expect, it } from "vitest"
import { loadConfig } from "./env.js"

describe("environment configuration", () => {
  it("builds exact role and CORS origins", () => {
    const config = loadConfig({
      NODE_ENV: "test",
      JWT_SECRET: "12345678901234567890123456789012",
      PIN_HMAC_SECRET: "12345678901234567890123456789012",
      LOGIN_ORIGIN: "http://login.test",
      DISPATCHER_ORIGIN: "http://dispatcher.test",
      LOADER_ORIGIN: "http://loader.test",
      DRIVER_ORIGIN: "http://driver.test",
      STORE_MANAGER_ORIGIN: "http://store.test",
    })
    expect(config.allowedOrigins).toEqual([
      "http://login.test", "http://dispatcher.test", "http://loader.test", "http://driver.test", "http://store.test",
    ])
    expect(config.roleOrigins.store_manager).toBe("http://store.test")
    expect(config.seedDemoScenario).toBe(false)
  })

  it("enables the deterministic demo scenario only when explicitly requested", () => {
    const config = loadConfig({ NODE_ENV: "test", SEED_DEMO_SCENARIO: "true" })
    expect(config.seedDemoScenario).toBe(true)
  })

  it("rejects an unsafe production secret", () => {
    expect(() => loadConfig({ NODE_ENV: "production" })).toThrow("JWT_SECRET")
  })
  it("uses existing defaults when values are missing", () => {
    const config = loadConfig({ NODE_ENV: "test" })
    expect(config.port).toBe(3000)
    expect(config.host).toBe("0.0.0.0")
    expect(config.mongodbUri).toBe("mongodb://localhost:27017/waylink")
    expect(config.accessTokenTtl).toBe("8h")
    expect(config.logLevel).toBe("info")
  })

  it("rejects invalid configuration types", () => {
    expect(() => loadConfig({ NODE_ENV: "test", PORT: "not-a-number" })).toThrow("Invalid environment configuration")
    expect(() => loadConfig({ NODE_ENV: "test", LOGIN_ORIGIN: "invalid-url" })).toThrow("Invalid environment configuration")
  })
})
