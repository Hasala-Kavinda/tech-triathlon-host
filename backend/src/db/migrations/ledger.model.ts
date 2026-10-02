import mongoose, { Schema } from "mongoose"

const schemaMigrationSchema = new Schema(
  {
    name: { type: String, required: true, unique: true },
    appliedAt: { type: Date, required: true },
    status: { type: String, enum: ["applied", "failed"], required: true }
  },
  { versionKey: false }
)

export const SchemaMigration = mongoose.model("SchemaMigration", schemaMigrationSchema, "schema_migrations")

const migrationLockSchema = new Schema(
  {
    _id: { type: String, required: true }, // We'll use a fixed ID like 'global_lock'
    lockedAt: { type: Date, required: true }
  },
  { versionKey: false }
)

export const MigrationLock = mongoose.model("MigrationLock", migrationLockSchema, "schema_migrations_lock")
