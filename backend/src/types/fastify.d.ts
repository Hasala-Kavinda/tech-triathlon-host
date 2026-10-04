import type { AppConfig } from "../config/env.js"
import type { Role } from "../database/models/index.js"

declare module "fastify" {
  interface FastifyInstance {
    config: AppConfig
    authenticate: (request: FastifyRequest) => Promise<void>
  }

  interface FastifyRequest {
    auth: {
      userId: string
      employeeId: string
      role: Role
      outletId?: string
      depot?: string
    } | null
  }
}

export {}
