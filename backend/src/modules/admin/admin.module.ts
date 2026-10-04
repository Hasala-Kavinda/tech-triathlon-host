import type { FastifyInstance } from "fastify"
import { adminRoutes } from "./routes.js"

export async function adminModule(app: FastifyInstance) {
  await app.register(adminRoutes)
}
