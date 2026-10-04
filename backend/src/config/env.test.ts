import { describe, expect, it } from "vitest"
import { assertFileProviderConfigured, loadConfig } from "./env.js"

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

  describe("DEV_MODE (development phase switch)", () => {
    it("is off unless explicitly enabled, so production logic is the default", () => {
      expect(loadConfig({ NODE_ENV: "test" }).devMode).toBe(false)
      expect(loadConfig({ NODE_ENV: "development", DEV_MODE: "false" }).devMode).toBe(false)
    })

    it("turns on when set to true", () => {
      expect(loadConfig({ NODE_ENV: "development", DEV_MODE: "true" }).devMode).toBe(true)
    })

    it("refuses to run in production", () => {
      expect(() => loadConfig({
        NODE_ENV: "production",
        JWT_SECRET: "a-real-secret-that-is-long-enough-123",
        PIN_HMAC_SECRET: "a-real-pin-secret-that-is-long-enough-1",
        DEV_MODE: "true",
      })).toThrow("DEV_MODE")
    })

    it("rejects values that are not a boolean", () => {
      expect(() => loadConfig({ NODE_ENV: "test", DEV_MODE: "yes" })).toThrow("Invalid environment configuration")
    })
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

describe("assertFileProviderConfigured (startup check for photo uploads)", () => {
  const ok = { CLOUDINARY_CLOUD_NAME: "demo-cloud", CLOUDINARY_API_KEY: "123456789012345", CLOUDINARY_API_SECRET: "abcDEF_secret-value" }

  it("passes when all three values are real", () => {
    expect(() => assertFileProviderConfigured(ok)).not.toThrow()
  })

  it("names every variable that is not set", () => {
    expect(() => assertFileProviderConfigured({})).toThrow(/CLOUDINARY_CLOUD_NAME is not set; CLOUDINARY_API_KEY is not set; CLOUDINARY_API_SECRET is not set/)
  })

  it("rejects empty and whitespace-only values (what docker compose passes when .env is missing)", () => {
    expect(() => assertFileProviderConfigured({ ...ok, CLOUDINARY_API_KEY: "" })).toThrow(/CLOUDINARY_API_KEY is empty/)
    expect(() => assertFileProviderConfigured({ ...ok, CLOUDINARY_API_SECRET: "   " })).toThrow(/CLOUDINARY_API_SECRET is empty/)
  })

  it("rejects the .env.example placeholders", () => {
    expect(() => assertFileProviderConfigured({ CLOUDINARY_CLOUD_NAME: "your-cloud-name-here", CLOUDINARY_API_KEY: "your-api-key-here", CLOUDINARY_API_SECRET: "your-api-secret-here" }))
      .toThrow(/CLOUDINARY_CLOUD_NAME still has a placeholder value[\s\S]*CLOUDINARY_API_KEY still has a placeholder[\s\S]*CLOUDINARY_API_SECRET still has a placeholder/)
  })

  it("a half-set configuration fails and says which part is missing", () => {
    expect(() => assertFileProviderConfigured({ CLOUDINARY_CLOUD_NAME: "demo-cloud" })).toThrow(/CLOUDINARY_API_KEY is not set; CLOUDINARY_API_SECRET is not set/)
  })

  it("tells the developer how to fix it", () => {
    expect(() => assertFileProviderConfigured({})).toThrow(/backend\/\.env\.example.*Cloudinary dashboard/s)
  })
})
