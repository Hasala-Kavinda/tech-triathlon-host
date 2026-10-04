import mongoose from "mongoose"
import { createBaseSchema } from "../../../db/model-conventions.js"

export const ROLES = ["admin", "dispatcher", "loader", "driver", "store_manager"] as const
export type Role = (typeof ROLES)[number]

export interface UserDoc {
  employeeId: string
  email: string
  name: string
  role: Role
  passwordHash: string
  outletId?: string
  depot?: string
  active: boolean
  mustChangePassword: boolean
  failedLoginCount: number
  passwordChangedAt?: Date | undefined
  lockedAt?: Date | undefined
  lockExpiresAt?: Date | undefined
  lastLoginAt?: Date | undefined
  deactivatedAt?: Date | undefined
  createdBy?: mongoose.Types.ObjectId
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
    active: { type: Boolean, required: true, default: true },
    mustChangePassword: { type: Boolean, required: true, default: true },
    failedLoginCount: { type: Number, required: true, default: 0, min: 0 },
    passwordChangedAt: { type: Date, default: () => new Date() },
    lockedAt: { type: Date },
    lockExpiresAt: { type: Date },
    lastLoginAt: { type: Date },
    deactivatedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { collection: "users" },
)

userSchema.index({ email: 1, role: 1 })
userSchema.index({ role: 1, active: 1 })
userSchema.index({ lockExpiresAt: 1 }, { expireAfterSeconds: 0 })

userSchema.pre("save", function () {
  if (this.isModified("employeeId")) {
    this.employeeId = String(this.employeeId).trim().toUpperCase()
  }
  if (this.isModified("email")) {
    this.email = String(this.email).trim().toLowerCase()
  }
  if (this.isModified("name")) {
    this.name = String(this.name).trim()
  }
  if (this.isModified("outletId") && this.outletId) {
    this.outletId = String(this.outletId).trim()
  }
  if (this.isModified("depot") && this.depot) {
    this.depot = String(this.depot).trim()
  }
})

export const User = mongoose.model<UserDoc>("User", userSchema)
