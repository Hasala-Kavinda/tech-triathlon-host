import Fastify, { type FastifyInstance } from "fastify"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import swagger from "@fastify/swagger"
import { ZodError } from "zod"
import mongoose from "mongoose"
import type { AppConfig } from "./config/env.js"
import { authenticateRequest } from "./common/auth.js"
import { AppError } from "./common/errors.js"
import { ok } from "./common/response.js"
import { databaseReady } from "./database/connection.js"
import { authRoutes } from "./modules/auth/routes.js"
import { referenceRoutes } from "./modules/reference/routes.js"
import { orderRoutes } from "./modules/orders/routes.js"
import { planningRoutes } from "./modules/planning/routes.js"
import { loadingRoutes } from "./modules/loading/routes.js"
import { driverRoutes } from "./modules/driver/routes.js"
import { operationRoutes } from "./modules/operations/routes.js"
import { fileRoutes } from "./modules/files/routes.js"

export async function createApp(config: AppConfig): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      level: config.logLevel,
      redact: {
        paths: [
          "req.headers.authorization",
          "req.body.password",
          "req.body.currentPassword",
          "req.body.handoffCode",
          "req.body.pin",
          "res.headers.authorization",
        ],
        censor: "[REDACTED]",
      },
    },
    bodyLimit: 1024 * 1024,
    requestIdHeader: "x-request-id",
  })

  app.decorate("config", config)
  app.decorateRequest("auth", null)
  app.decorate("authenticate", async function authenticate(request) {
    await authenticateRequest(app, request)
  })

  await app.register(helmet, { contentSecurityPolicy: false })
  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || config.allowedOrigins.includes(origin)) callback(null, true)
      else callback(new Error("Origin not allowed"), false)
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key", "If-Match", "X-Request-Id"],
    exposedHeaders: ["X-Request-Id"],
    credentials: false,
    maxAge: 600,
  })
  await app.register(rateLimit, { max: 300, timeWindow: "1 minute" })
  await app.register(swagger, {
    openapi: {
      info: { title: "WayLink API", version: "1.0.0", description: "Backend contract for WayLink logistics operations." },
      servers: [{ url: "/api/v1" }],
      components: { securitySchemes: { bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
    },
  })

  app.addHook("onSend", async (request, reply, payload) => {
    reply.header("x-request-id", request.id)
    return payload
  })

  app.get("/health/live", async (request) => ok(request, { status: "alive", version: "1.0.0" }))
  app.get("/health/ready", async (request, reply) => {
    const ready = databaseReady()
    return reply.status(ready ? 200 : 503).send({
      success: ready,
      data: { status: ready ? "ready" : "not_ready", database: mongoose.connection.readyState },
      requestId: request.id,
    })
  })

  await app.register(async (api) => {
    await api.register(authRoutes)
    await api.register(referenceRoutes)
    await api.register(orderRoutes)
    await api.register(planningRoutes)
    await api.register(loadingRoutes)
    await api.register(driverRoutes)
    await api.register(operationRoutes)
    await api.register(fileRoutes)
  }, { prefix: "/api/v1" })

  app.get("/docs/openapi.json", async (_request, reply) => reply.send(app.swagger()))

  app.setNotFoundHandler((request, reply) => {
    void reply.status(404).send({ success: false, error: { code: "NOT_FOUND", message: "The requested route was not found." }, requestId: request.id })
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: { code: error.code, message: error.message, ...(error.details === undefined ? {} : { details: error.details }) },
        requestId: request.id,
      })
    }
    if (error instanceof ZodError) {
      return reply.status(400).send({ success: false, error: { code: "VALIDATION_ERROR", message: "The request is invalid.", details: error.flatten() }, requestId: request.id })
    }
    if ((error as unknown as { code?: number }).code === 11000) {
      return reply.status(409).send({ success: false, error: { code: "DUPLICATE_RESOURCE", message: "A resource with this business key already exists." }, requestId: request.id })
    }
    request.log.error({ err: error }, "Unhandled request error")
    return reply.status(500).send({ success: false, error: { code: "INTERNAL_ERROR", message: "An unexpected error occurred." }, requestId: request.id })
  })

  return app
}
