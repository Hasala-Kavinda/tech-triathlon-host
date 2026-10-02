import { FastifyInstance } from "fastify"
import { authRoutes } from "./routes.js"

export async function authModule(app: FastifyInstance) {
  await app.register(authRoutes)
}
