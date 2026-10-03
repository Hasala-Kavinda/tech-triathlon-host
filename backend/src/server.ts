import { createApp } from "./app/create-app.js"
import { loadConfig } from "./config/env.js"
import { connectDatabase, disconnectDatabase } from "./db/connection.js"

const config = loadConfig()
await connectDatabase(config.mongodbUri)
const app = await createApp(config)

async function shutdown(signal: string) {
  app.log.info({ signal }, "Shutting down")
  await app.close()
  await disconnectDatabase()
  process.exit(0)
}

process.on("SIGINT", () => void shutdown("SIGINT"))
process.on("SIGTERM", () => void shutdown("SIGTERM"))

try {
  await app.listen({ host: config.host, port: config.port })
  app.log.info({ environment: config.nodeEnv, port: config.port }, "WayLink API started")
} catch (error) {
  app.log.error(error)
  await disconnectDatabase()
  process.exit(1)
}
