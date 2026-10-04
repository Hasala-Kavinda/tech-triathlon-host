import { readFile } from "node:fs/promises"
import { resolve } from "node:path"
import { parse } from "csv-parse/sync"
import { loadConfig } from "../../config/env.js"
import { type CsvRow, validateReferenceData } from "./preflight.js"

async function csv(file: string) {
  const content = await readFile(file, "utf8")
  return parse(content, { columns: true, skip_empty_lines: true, trim: true }) as CsvRow[]
}

async function main() {
  const config = loadConfig()
  const productFile = process.argv[2] || config.cscProductsFile
  if (!productFile) throw new Error("Provide the CSC product CSV path as an argument or CSC_PRODUCTS_FILE")
  const referenceDir = resolve(process.cwd(), config.referenceDataDir)
  const resolvedProductFile = resolve(process.cwd(), productFile)
  const [outlets, vehicles, calendar, products] = await Promise.all([
    csv(resolve(referenceDir, "outlets.csv")),
    csv(resolve(referenceDir, "vehicles.csv")),
    csv(resolve(referenceDir, "calendar.csv")),
    csv(resolvedProductFile),
  ])
  const summary = validateReferenceData({ outlets, vehicles, calendar, products, productFile: resolvedProductFile })
  console.info(JSON.stringify({ event: "reference_data_preflight_passed", ...summary }, null, 2))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
