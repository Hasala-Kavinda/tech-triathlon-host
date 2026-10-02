import { FastifyInstance } from "fastify"
import { loadingRoutes } from "./routes.js"

export async function loadingModule(app: FastifyInstance) {
  await app.register(loadingRoutes)
}
