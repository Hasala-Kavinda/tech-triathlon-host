import "dotenv/config"
import { z } from "zod"

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("0.0.0.0"),
  MONGODB_URI: z.string().min(1).default("mongodb://localhost:27017/waylink"),
  JWT_SECRET: z.string().min(32).default("development-only-secret-change-me-now"),
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

  const roleOrigins = {
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
    accessTokenTtl: data.ACCESS_TOKEN_TTL,
    loginOrigin: data.LOGIN_ORIGIN,
    roleOrigins,
    allowedOrigins: [data.LOGIN_ORIGIN, ...Object.values(roleOrigins)],
    referenceDataDir: data.REFERENCE_DATA_DIR,
    cscProductsFile: data.CSC_PRODUCTS_FILE || undefined,
    allowDemoProducts: data.ALLOW_DEMO_PRODUCTS === "true",
    seedDemoScenario: data.SEED_DEMO_SCENARIO === "true",
    logLevel: data.LOG_LEVEL,
    cloudinary: data.CLOUDINARY_CLOUD_NAME && data.CLOUDINARY_API_KEY && data.CLOUDINARY_API_SECRET
      ? { cloudName: data.CLOUDINARY_CLOUD_NAME, apiKey: data.CLOUDINARY_API_KEY, apiSecret: data.CLOUDINARY_API_SECRET }
      : undefined,
  }
}
