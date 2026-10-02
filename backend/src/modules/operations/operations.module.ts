import { FastifyInstance } from "fastify"
import { operationRoutes } from "./routes.js"

export async function operationsModule(app: FastifyInstance) {
  await app.register(operationRoutes)
}
