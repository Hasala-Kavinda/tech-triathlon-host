import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { AppError, badRequest } from "../../common/errors.js"
import { ok } from "../../common/response.js"
import { runScenario, STAGES } from "./scenario.js"

const iso = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "must be an ISO date-time")
const body = z.object({
  stage: z.enum(STAGES),
  outletId: z.string().optional(), orderType: z.string().optional(), productSku: z.string().optional(), quantity: z.number().int().min(1).max(1000).optional(),
  vehicleId: z.string().optional(), driverEmployeeId: z.string().optional(), loaderEmployeeId: z.string().optional(),
  asOf: iso.optional(), serviceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), departureTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  arrivedAt: iso.optional(), completedAt: iso.optional(),
})

export async function devRoutes(app: FastifyInstance) {
  app.post("/dev/seed-scenario", { preHandler: app.authenticate }, async (request) => {
    // Second guard: the plugin is only registered in development, and the handler refuses anywhere else too.
    if (app.config.nodeEnv !== "development") throw new AppError(404, "NOT_FOUND", "The requested route was not found.")
    requireRole(request, "dispatcher")
    const parsed = body.safeParse(request.body)
    if (!parsed.success) throw badRequest("The scenario request is invalid.", parsed.error.flatten())
    return ok(request, await runScenario(app, parsed.data))
  })
}
