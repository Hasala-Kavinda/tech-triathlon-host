import { FastifyInstance } from "fastify"
import { referenceRoutes } from "./routes.js"

export async function referenceModule(app: FastifyInstance) {
  await app.register(referenceRoutes)
}
