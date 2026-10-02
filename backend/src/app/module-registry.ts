import { FastifyInstance } from "fastify"
import { authRoutes } from "../modules/auth/routes.js"
import { referenceRoutes } from "../modules/reference/routes.js"
import { orderRoutes } from "../modules/orders/routes.js"
import { planningRoutes } from "../modules/planning/routes.js"
import { loadingRoutes } from "../modules/loading/routes.js"
import { driverRoutes } from "../modules/driver/routes.js"
import { operationRoutes } from "../modules/operations/routes.js"
import { fileRoutes } from "../modules/files/routes.js"

export async function registerModules(api: FastifyInstance) {
  await api.register(authRoutes)
  await api.register(referenceRoutes)
  await api.register(orderRoutes)
  await api.register(planningRoutes)
  await api.register(loadingRoutes)
  await api.register(driverRoutes)
  await api.register(operationRoutes)
  await api.register(fileRoutes)
}
