import { loadConfig } from "../../config/env.js"
import { connectDatabase, disconnectDatabase } from "../connection.js"
import { MigrationRunner } from "./runner.js"

async function main() {
  const config = loadConfig()
  try {
    await connectDatabase(config.mongodbUri)
    console.log("[Migration] Database connected, starting migration run...")
    await MigrationRunner.run()
    console.log("[Migration] Migration run complete.")
  } catch (error) {
    console.error("[Migration] Fatal error during migration:", error)
    process.exit(1)
  } finally {
    await disconnectDatabase()
  }
}

main()
