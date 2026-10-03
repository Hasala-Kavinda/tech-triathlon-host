import mongoose, { Schema } from "mongoose"
import { createBaseSchema } from "../../../db/model-conventions.js"

export interface AuthHandoffDoc {
  codeHash: string
  userId: mongoose.Types.ObjectId
  intendedOrigin: string
  expiresAt: Date
  consumedAt?: Date
  version?: number
  createdAt?: Date
  updatedAt?: Date
}

const authHandoffSchema = createBaseSchema<AuthHandoffDoc>(
  {
    codeHash: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    intendedOrigin: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    consumedAt: { type: Date },
  }
)

authHandoffSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })
authHandoffSchema.index({ userId: 1, createdAt: -1 })

export const AuthHandoff = mongoose.model("AuthHandoff", authHandoffSchema)
