import { randomBytes } from "node:crypto"
import argon2 from "argon2"
import { connectDatabase, disconnectDatabase } from "../db/connection.js"
import { loadConfig } from "../config/env.js"
import { User } from "../modules/auth/persistence/user.model.js"

const args = new Set(process.argv.slice(2))
const config = loadConfig()

async function main() {
  const existingAdminCount = await User.countDocuments({ role: "admin" })
  if (existingAdminCount > 0 && !args.has("--additional")) {
    throw new Error("An admin already exists. Re-run with --additional to create another admin.")
  }

  if (config.nodeEnv === "production" && !config.allowAdminBootstrap) {
    throw new Error("ADMIN bootstrap is disabled in production. Set ALLOW_ADMIN_BOOTSTRAP=true.")
  }

  const password = config.adminBootstrapPassword || `${randomBytes(16).toString("base64url").replace(/[^A-Za-z0-9]/g, "").slice(0, 12)}Aa!1`
  if (password.length < 12) {
    throw new Error("Bootstrap password must be at least 12 characters long.")
  }

  if (!config.allowAdminBootstrap && config.nodeEnv !== "production") {
    throw new Error("Set ALLOW_ADMIN_BOOTSTRAP=true to allow bootstrap.")
  }

  await connectDatabase(config.mongodbUri)
  const employeeId = process.env.ADMIN_BOOTSTRAP_EMPLOYEE_ID || "ADM-1001"
  const existing = await User.findOne({ employeeId })
  if (existing) {
    throw new Error(`Employee ID ${employeeId} is already in use.`)
  }

  const user = await User.create({
    employeeId,
    email: process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@waylink.local",
    name: "System Administrator",
    role: "admin",
    passwordHash: await argon2.hash(password),
    active: true,
    mustChangePassword: true,
    failedLoginCount: 0,
  })

  console.log(`ADMIN_BOOTSTRAP_USER=${user.employeeId}`)
  console.log(`ADMIN_BOOTSTRAP_PASSWORD=${password}`)
  console.log("Please change this password on first login.")
  await disconnectDatabase()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
