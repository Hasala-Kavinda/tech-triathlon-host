import { FastifyInstance } from "fastify"
import { orderRoutes } from "../orders/routes.js"

export async function storeModule(app: FastifyInstance) {
  await app.register(orderRoutes)
}
