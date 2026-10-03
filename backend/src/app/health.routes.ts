import { FastifyInstance } from "fastify"
import mongoose from "mongoose"
import { ok } from "../common/response.js"
import { databaseReady } from "../db/connection.js"

export async function healthRoutes(app: FastifyInstance) {
  app.get("/health/live", async (request) => ok(request, { status: "alive", version: "1.0.0" }))
  
  app.get("/health/ready", async (request, reply) => {
    const ready = databaseReady()
    return reply.status(ready ? 200 : 503).send({
      success: ready,
      data: { status: ready ? "ready" : "not_ready", database: mongoose.connection.readyState },
      requestId: request.id,
    })
  })
}
