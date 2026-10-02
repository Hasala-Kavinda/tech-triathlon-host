import mongoose, { Schema } from "mongoose"
import { createBaseSchema } from "../../../db/model-conventions.js"

export interface ProductDoc {
  sku: string
  name: string
  brand: string
  orderTypes: string[]
  unit: string
  weightKg: number
  volumeM3: number
  temperatureClass: string
  fragile?: boolean
  source: string
  assumptions?: string[]
  active: boolean
  version?: number
  createdAt?: Date
  updatedAt?: Date
}

const productSchema = createBaseSchema<ProductDoc>({
  sku: { type: String, required: true, unique: true, uppercase: true, trim: true },
  name: { type: String, required: true, trim: true },
  brand: { type: String, required: true },
  orderTypes: [{ type: String, required: true }],
  unit: { type: String, required: true },
  weightKg: { type: Number, required: true, min: 0 },
  volumeM3: { type: Number, required: true, min: 0 },
  temperatureClass: { type: String, required: true },
  fragile: { type: Boolean, default: false },
  source: { type: String, required: true },
  assumptions: [{ type: String }],
  active: { type: Boolean, default: true },
})

productSchema.index({ brand: 1, active: 1, name: 1 })

export const Product = mongoose.model("Product", productSchema)
