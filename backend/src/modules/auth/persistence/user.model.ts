import mongoose from "mongoose"
import { createBaseSchema } from "../../../db/model-conventions.js"

export const ROLES = ["dispatcher", "loader", "driver", "store_manager"] as const
export type Role = (typeof ROLES)[number]

export interface UserDoc {
  employeeId: string
  email: string
  name: string
  role: Role
  passwordHash: string
  outletId?: string
  depot?: string
  phoneE164?: string
  active: boolean
  lockedAt?: Date
  lastLoginAt?: Date
  version?: number
  createdAt?: Date
  updatedAt?: Date
}

const userSchema = createBaseSchema<UserDoc>(
  {
    employeeId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ROLES, required: true },
    passwordHash: { type: String, required: true, select: false },
    outletId: { type: String, trim: true },
    depot: { type: String, trim: true },
    phoneE164: { type: String, trim: true, match: /^\+[1-9]\d{6,14}$/ },
    active: { type: Boolean, default: true },
    lockedAt: { type: Date },
    lastLoginAt: { type: Date },
  }
)
userSchema.index({ email: 1, role: 1 })
userSchema.index({ role: 1, active: 1 })

export const User = mongoose.model("User", userSchema)
