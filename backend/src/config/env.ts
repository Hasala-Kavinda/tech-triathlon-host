import "dotenv/config"
import { z } from "zod"

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/waylink"),
  JWT_SECRET: z.string().min(32).default("development-only-secret-change-me-now"),
  PIN_HMAC_SECRET: z.string().min(32).default("development-only-pin-secret-change-me-now"),
  ACCESS_TOKEN_TTL: z.string().default("8h"),
  LOGIN_ORIGIN: z.string().url().default("http://localhost:5173"),
  DISPATCHER_ORIGIN: z.string().url().default("http://localhost:5174"),
  LOADER_ORIGIN: z.string().url().default("http://localhost:5175"),
  DRIVER_ORIGIN: z.string().url().default("http://localhost:5176"),
  STORE_MANAGER_ORIGIN: z.string().url().default("http://localhost:5177"),
  REFERENCE_DATA_DIR: z.string().default("../Drive Data"),
  CSC_PRODUCTS_FILE: z.string().optional(),
  ALLOW_DEMO_PRODUCTS: z.enum(["true", "false"]).default("false"),
  SEED_DEMO_SCENARIO: z.enum(["true", "false"]).default("false"),
  ALLOW_ADMIN_BOOTSTRAP: z.enum(["true", "false"]).default("false"),
  ADMIN_BOOTSTRAP_PASSWORD: z.string().min(12).optional(),
  // Development phase switch. When "true" the order-date and Fresh-deadline rules are relaxed so
  // the scheduling flow can be tested at any time of day. Never allowed in production.
  DEV_MODE: z.enum(["true", "false"]).default("false"),
  LOG_LEVEL: z.string().default("info"),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
})

export type AppConfig = ReturnType<typeof loadConfig>

export function loadConfig(input: NodeJS.ProcessEnv = process.env) {
  const result = schema.safeParse(input)
  if (!result.success) {
    const issues = result.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ")
    throw new Error(`Invalid environment configuration: ${issues}`)
  }

  const data = result.data
  if (data.NODE_ENV === "production" && data.JWT_SECRET.startsWith("development-only")) {
    throw new Error("JWT_SECRET must be replaced in production")
  }
  if (data.NODE_ENV === "production" && data.PIN_HMAC_SECRET.startsWith("development-only")) {
    throw new Error("PIN_HMAC_SECRET must be replaced in production")
  }

  if (data.NODE_ENV === "production" && data.DEV_MODE === "true") {
    throw new Error("DEV_MODE must be false in production")
  }
  const roleOrigins = {
    admin: data.LOGIN_ORIGIN,
    dispatcher: data.DISPATCHER_ORIGIN,
    loader: data.LOADER_ORIGIN,
    driver: data.DRIVER_ORIGIN,
    store_manager: data.STORE_MANAGER_ORIGIN,
  } as const

  return {
    nodeEnv: data.NODE_ENV,
    port: data.PORT,
    host: data.HOST,
    mongodbUri: data.MONGODB_URI,
    jwtSecret: data.JWT_SECRET,
    pinHmacSecret: data.PIN_HMAC_SECRET,
    accessTokenTtl: data.ACCESS_TOKEN_TTL,
    loginOrigin: data.LOGIN_ORIGIN,
    roleOrigins,
    allowedOrigins: Array.from(new Set([data.LOGIN_ORIGIN, ...Object.values(roleOrigins)])),
    referenceDataDir: data.REFERENCE_DATA_DIR,
    cscProductsFile: data.CSC_PRODUCTS_FILE || undefined,
    allowDemoProducts: data.ALLOW_DEMO_PRODUCTS === "true",
    seedDemoScenario: data.SEED_DEMO_SCENARIO === "true",
    allowAdminBootstrap: data.ALLOW_ADMIN_BOOTSTRAP === "true",
    adminBootstrapPassword: data.ADMIN_BOOTSTRAP_PASSWORD,
    devMode: data.DEV_MODE === "true",
    logLevel: data.LOG_LEVEL,
    cloudinary: data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET
      ? { cloudName: data.CLOUDINARY_CLOUD_NAME, apiKey: data.CLOUDINARY_API_KEY, apiSecret: data.CLOUDINARY_API_SECRET }
      : undefined,
  }
}

const CLOUDINARY_VARIABLES = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"] as const
const PLACEHOLDER = /^(your[-_]|replace[-_]|change[-_]?me|<.*>$|xxx)/i

/**
 * Photo uploads (Driver meter photos, receipt evidence) need Cloudinary. Called once at API startup so a
 * missing, empty, placeholder or half-set configuration stops the server immediately, with the exact
 * variables named, instead of failing later when a Driver reaches the meter-photo screen. It reads the raw
 * environment (not AppConfig) so it can say which variable is wrong; it is deliberately NOT part of
 * `loadConfig`, so the seed job, migrations and unit tests that never upload photos are unaffected.
 */
export function assertFileProviderConfigured(input: NodeJS.ProcessEnv = process.env) {
  const problems: string[] = []
  for (const name of CLOUDINARY_VARIABLES) {
    const value = input[name]?.trim()
    if (!value) problems.push(`${name} is ${input[name] === undefined ? "not set" : "empty"}`)
    else if (PLACEHOLDER.test(value)) problems.push(`${name} still has a placeholder value ("${value}")`)
  }
  if (problems.length) {
    throw new Error(
      `Image uploads are not configured: ${problems.join("; ")}. ` +
      "Copy backend/.env.example to backend/.env (and the three CLOUDINARY_* lines into the repo-root .env for docker compose) " +
      "and fill in the values from the Cloudinary dashboard (Settings -> API Keys). Restart the API afterwards.",
    )
  }
}
