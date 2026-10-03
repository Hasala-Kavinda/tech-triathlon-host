import Fastify, { type FastifyInstance } from "fastify"
import cors from "@fastify/cors"
import helmet from "@fastify/helmet"
import rateLimit from "@fastify/rate-limit"
import swagger from "@fastify/swagger"
import { ZodError } from "zod"
import type { AppConfig } from "../config/env.js"
import { authenticateRequest } from "../common/auth.js"
import { AppError } from "../common/errors.js"
import { healthRoutes } from "./health.routes.js"
import { registerModules } from "./module-registry.js"

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

  await app.register(healthRoutes)

  await app.register(registerModules, { prefix: "/api/v1" })

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
