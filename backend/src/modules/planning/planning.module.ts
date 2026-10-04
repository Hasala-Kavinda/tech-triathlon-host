import { FastifyInstance } from "fastify"
import { planningRoutes } from "./routes.js"

export async function planningModule(app: FastifyInstance) {
  await app.register(planningRoutes)
}
