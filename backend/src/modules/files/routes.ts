import { timingSafeEqual } from "node:crypto"
import { v2 as cloudinary } from "cloudinary"
import type { FastifyInstance } from "fastify"
import { z } from "zod"
import { requireRole } from "../../common/auth.js"
import { AppError, badRequest, forbidden, notFound } from "../../common/errors.js"
import { ok } from "../../common/response.js"
import { FileAssetCommandPort } from "./file-asset.command-port.js"
import { FileAsset } from "./persistence/file-asset.model.js"

const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"])
const MAX_BYTES = 8 * 1024 * 1024
const safeEqual = (left: string, right: string) => {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function fileRoutes(app: FastifyInstance) {
  app.post("/files/upload-signature", { preHandler: app.authenticate, config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (request) => {
    const auth = requireRole(request, "driver", "store_manager")
    if (!app.config.cloudinary) throw new AppError(503, "FILE_PROVIDER_UNAVAILABLE", "The image provider is not configured.")
    cloudinary.config({ cloud_name: app.config.cloudinary.cloudName, api_key: app.config.cloudinary.apiKey, api_secret: app.config.cloudinary.apiSecret, secure: true })
    const body = z.object({ kind: z.enum(["start_meter", "end_meter", "delivery_issue", "receipt_issue"]), tripId: z.string().optional(), deliveryId: z.string().optional(), mimeType: z.string(), bytes: z.number().int().positive() }).safeParse(request.body)
    if (!body.success) throw badRequest("The upload request is invalid.")
    if (!ALLOWED_MIME.has(body.data.mimeType) || body.data.bytes > MAX_BYTES) throw badRequest("Only JPEG, PNG, or WebP images up to 8 MB are accepted.")
    if (!body.data.tripId && !body.data.deliveryId) throw badRequest("The upload must belong to a trip or delivery.")
    const timestamp = Math.floor(Date.now() / 1000)
    const folder = `waylink/${auth.userId}/${body.data.kind}`
    return ok(request, { cloudName: app.config.cloudinary.cloudName, apiKey: app.config.cloudinary.apiKey, timestamp, folder, uploadType: "authenticated", signature: cloudinary.utils.api_sign_request({ folder, timestamp, type: "authenticated" }, app.config.cloudinary.apiSecret), expiresAt: new Date((timestamp + 300) * 1000).toISOString() })
  })

  app.post("/files/complete", { preHandler: app.authenticate }, async (request, reply) => {
    const auth = requireRole(request, "driver", "store_manager")
    if (!app.config.cloudinary) throw new AppError(503, "FILE_PROVIDER_UNAVAILABLE", "The image provider is not configured.")
    cloudinary.config({ cloud_name: app.config.cloudinary.cloudName, api_key: app.config.cloudinary.apiKey, api_secret: app.config.cloudinary.apiSecret, secure: true })
    const body = z.object({ publicId: z.string().min(1), providerVersion: z.number().int().positive(), providerSignature: z.string().length(40), kind: z.string(), tripId: z.string().optional(), deliveryId: z.string().optional(), mimeType: z.string(), format: z.enum(["jpg", "jpeg", "png", "webp"]), bytes: z.number().int().positive().max(MAX_BYTES), capturedAt: z.coerce.date() }).safeParse(request.body)
    if (!body.success) throw badRequest("The completed upload metadata is invalid.")
    if (!body.data.publicId.startsWith(`waylink/${auth.userId}/`)) throw forbidden("The uploaded asset does not belong to this user.")
    const expected = cloudinary.utils.api_sign_request({ public_id: body.data.publicId, version: body.data.providerVersion }, app.config.cloudinary.apiSecret)
    if (!safeEqual(expected, body.data.providerSignature)) throw forbidden("The image provider signature is invalid.")
    const asset = await FileAssetCommandPort.recordVerifiedAsset({ ...body.data, ownerId: auth.userId })
    return reply.status(201).send(ok(request, asset.toObject()))
  })

  app.get("/files/:fileId", { preHandler: app.authenticate }, async (request) => {
    requireRole(request, "dispatcher", "loader", "driver", "store_manager")
    if (!app.config.cloudinary) throw new AppError(503, "FILE_PROVIDER_UNAVAILABLE", "The image provider is not configured.")
    cloudinary.config({ cloud_name: app.config.cloudinary.cloudName, api_key: app.config.cloudinary.apiKey, api_secret: app.config.cloudinary.apiSecret, secure: true })
    const params = z.object({ fileId: z.string() }).safeParse(request.params)
    if (!params.success) throw badRequest("A file ID is required.")
    const asset = await FileAsset.findById(params.data.fileId).lean()
    if (!asset) throw notFound()
    const expiresAt = Math.floor(Date.now() / 1000) + 300
    const deliveryUrl = cloudinary.utils.private_download_url(asset.publicId, asset.format, { resource_type: "image", type: "authenticated", expires_at: expiresAt })
    return ok(request, { url: deliveryUrl, expiresAt: new Date(expiresAt * 1000).toISOString() })
  })
}
