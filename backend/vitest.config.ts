import { defineConfig } from "vitest/config"

const workerId = process.env.VITEST_POOL_ID ?? "default"
const databaseName = `waylink_test_${String(workerId).replace(/[^a-zA-Z0-9_-]/g, "_")}`
if (!process.env.MONGODB_URI) {
  process.env.MONGODB_URI = `mongodb://localhost:27017/${databaseName}`
}

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: { reporter: ["text", "html"] },
  },
})
