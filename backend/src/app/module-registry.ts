import { FastifyInstance } from "fastify"
import { authModule } from "../modules/auth/auth.module.js"
import { referenceModule } from "../modules/reference/reference.module.js"
import { storeModule } from "../modules/store/store.module.js"
import { planningModule } from "../modules/planning/planning.module.js"
import { loadingModule } from "../modules/loading/loading.module.js"
import { deliveryModule } from "../modules/delivery/delivery.module.js"
import { operationsModule } from "../modules/operations/operations.module.js"
import { filesModule } from "../modules/files/files.module.js"

export async function registerModules(api: FastifyInstance) {
  await api.register(authModule)
  await api.register(referenceModule)
  await api.register(storeModule)
  await api.register(planningModule)
  await api.register(loadingModule)
  await api.register(deliveryModule)
  await api.register(operationsModule)
  await api.register(filesModule)
}
