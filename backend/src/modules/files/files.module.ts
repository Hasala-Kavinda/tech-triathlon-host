import { FastifyInstance } from "fastify"
import { fileRoutes } from "./routes.js"

export async function filesModule(app: FastifyInstance) {
  await app.register(fileRoutes)
}
