import { FastifyInstance } from "fastify"
import { driverRoutes } from "../driver/routes.js"

export async function deliveryModule(app: FastifyInstance) {
  await app.register(driverRoutes)
}
