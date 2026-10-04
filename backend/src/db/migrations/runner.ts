import fs from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { SchemaMigration, MigrationLock } from "./ledger.model.js"

export interface Migration {
  name: string
  up: () => Promise<void>
}

export class MigrationRunner {
  static async acquireLock() {
    try {
      await MigrationLock.create({ _id: "global_lock", lockedAt: new Date() })
      return true
    } catch (e: any) {
      if (e.code === 11000) return false
      throw e
    }
  }

  static async releaseLock() {
    await MigrationLock.deleteOne({ _id: "global_lock" })
  }

  static async discoverMigrations(scriptsDir: string): Promise<Migration[]> {
    const files = await fs.readdir(scriptsDir).catch(() => [] as string[])
    const scriptFiles = files.filter(f => f.endsWith(".js") || f.endsWith(".ts"))
    
    // Ensure deterministic ordering based on filename (e.g., 001_init, 002_add_field)
    scriptFiles.sort()
    
    const migrations: Migration[] = []
    for (const file of scriptFiles) {
      if (file.endsWith(".d.ts")) continue
      if (file.includes(".test.")) continue
      
      const name = path.basename(file, path.extname(file))
      const fullPath = path.join(scriptsDir, file)
      // Path must be a file URL for dynamic import on Windows
      const fileUrl = new URL(`file://${fullPath}`).href
      
      const module = await import(fileUrl)
      if (typeof module.up !== "function") {
        throw new Error(`Migration ${name} is missing an 'up' function export`)
      }
      migrations.push({ name, up: module.up })
    }
    return migrations
  }

  static async run(scriptsDir?: string, providedMigrations?: Migration[]) {
    let migrations = providedMigrations
    
    if (!migrations) {
      const dir = scriptsDir || path.join(path.dirname(fileURLToPath(import.meta.url)), "scripts")
      migrations = await this.discoverMigrations(dir)
    }

    // Always sort to ensure deterministic execution order
    const sortedMigrations = [...migrations].sort((a, b) => a.name.localeCompare(b.name))

    const locked = await this.acquireLock()
    if (!locked) {
      throw new Error("Could not acquire migration lock. Another migration is in progress.")
    }

    try {
      await SchemaMigration.syncIndexes()
      
      const applied = await SchemaMigration.find({ status: "applied" }).lean()
      const appliedNames = new Set(applied.map(m => m.name))

      for (const migration of sortedMigrations) {
        if (appliedNames.has(migration.name)) {
          console.log(`[Migration] Skipping already applied: ${migration.name}`)
          continue
        }

        console.log(`[Migration] Running: ${migration.name}`)
        try {
          await migration.up()
          await SchemaMigration.create({
            name: migration.name,
            status: "applied",
            appliedAt: new Date()
          })
          console.log(`[Migration] Completed: ${migration.name}`)
        } catch (error) {
          console.error(`[Migration] Failed: ${migration.name}`)
          throw error
        }
      }
    } finally {
      await this.releaseLock()
    }
  }
}
